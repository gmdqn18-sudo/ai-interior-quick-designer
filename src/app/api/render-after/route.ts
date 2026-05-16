import { NextRequest, NextResponse } from "next/server";

import {
  buildAfterImagePrompt,
  normalizeRenderAfterRequest,
  type RenderAfterInput,
  type RenderAfterRequest,
  type RenderAfterResponse,
} from "@/lib/after-image";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_IMAGE_MODEL = "gpt-image-1";
const OPENAI_IMAGE_SIZE = "1536x1024";

async function callOpenAIImageEdit(input: RenderAfterInput) {
  const prompt = buildAfterImagePrompt({
    concept: input.concept,
    userPrompt: input.userPrompt,
    keptFurniture: input.keptFurniture,
  });

  const imageBytes = input.image.bytes;
  const imageArrayBuffer = imageBytes.buffer.slice(
    imageBytes.byteOffset,
    imageBytes.byteOffset + imageBytes.byteLength,
  ) as ArrayBuffer;

  const formData = new FormData();
  formData.append("model", OPENAI_IMAGE_MODEL);
  formData.append("prompt", prompt);
  formData.append("size", OPENAI_IMAGE_SIZE);
  formData.append("image", new Blob([imageArrayBuffer], { type: input.image.mimeType }), "room.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `OpenAI image API failed with status ${response.status}`);
  }

  const firstImage = data.data?.[0];
  const imageUrl = firstImage?.b64_json ? `data:image/png;base64,${firstImage.b64_json}` : firstImage?.url;

  if (!imageUrl) {
    throw new Error("OpenAI 응답에 이미지가 포함되지 않았습니다.");
  }

  return { imageUrl, prompt };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RenderAfterRequest;
  const normalized = normalizeRenderAfterRequest(body);

  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const prompt = buildAfterImagePrompt({
    concept: normalized.input.concept,
    userPrompt: normalized.input.userPrompt,
    keptFurniture: normalized.input.keptFurniture,
  });

  if (!process.env.OPENAI_API_KEY) {
    const response: RenderAfterResponse = {
      imageUrl: null,
      prompt,
      mode: "mock-image-preview",
      provider: "mock",
      error: "OPENAI_API_KEY가 설정되지 않아 실제 이미지 생성은 건너뛰었습니다.",
      meta: {
        model: "none",
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
      },
    };
    return NextResponse.json(response, { status: 200 });
  }

  try {
    const result = await callOpenAIImageEdit(normalized.input);
    const response: RenderAfterResponse = {
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      mode: "openai-image-edit",
      provider: "openai",
      meta: {
        model: OPENAI_IMAGE_MODEL,
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: RenderAfterResponse = {
      imageUrl: null,
      prompt,
      mode: "mock-image-preview",
      provider: "mock",
      error: error instanceof Error ? error.message : "이미지 생성 중 알 수 없는 오류가 발생했습니다.",
      meta: {
        model: OPENAI_IMAGE_MODEL,
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 502 });
  }
}
