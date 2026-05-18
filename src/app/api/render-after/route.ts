import { NextRequest, NextResponse } from "next/server";

import {
  buildAfterImagePrompt,
  buildProductCompositePrompt,
  normalizeRenderAfterRequest,
  type ParsedImageData,
  type RenderAfterInput,
  type RenderAfterRequest,
  type RenderAfterResponse,
} from "@/lib/after-image";
import { composeProductImageOntoRoom, type ProductCompositionResult } from "@/lib/product-composition";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;
const OPENAI_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1536x1024";
const DEFAULT_OPENAI_IMAGE_TIMEOUT_MS = 240_000;

function getOpenAIImageTimeoutMs() {
  const raw = Number.parseInt(process.env.OPENAI_IMAGE_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_OPENAI_IMAGE_TIMEOUT_MS;
  return Math.min(285_000, Math.max(10_000, raw));
}

function toImageDataUrl(image: ParsedImageData) {
  return `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`;
}

async function callOpenAIImageEdit(input: { image: ParsedImageData; prompt: string }) {
  const imageBytes = input.image.bytes;
  const imageArrayBuffer = imageBytes.buffer.slice(
    imageBytes.byteOffset,
    imageBytes.byteOffset + imageBytes.byteLength,
  ) as ArrayBuffer;

  const formData = new FormData();
  formData.append("model", OPENAI_IMAGE_MODEL);
  formData.append("prompt", input.prompt);
  formData.append("size", OPENAI_IMAGE_SIZE);
  formData.append("image", new Blob([imageArrayBuffer], { type: input.image.mimeType }), "room.png");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOpenAIImageTimeoutMs());

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

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

  return { imageUrl, prompt: input.prompt };
}

function buildCompositePreviewResponse(
  input: RenderAfterInput,
  prepared: {
    image: ParsedImageData;
    prompt: string;
    composition?: ProductCompositionResult;
    fallbackReason?: string;
  },
  error: string,
): RenderAfterResponse {
  return {
    imageUrl: toImageDataUrl(prepared.image),
    prompt: prepared.prompt,
    mode: "product-composite-preview",
    provider: "server-composite",
    error,
    meta: {
      model: "server-composite",
      conceptId: input.concept.id,
      generatedAt: new Date().toISOString(),
      productReferenceId: input.productReference?.id,
      compositionMode: prepared.composition ? "single-product-preset" : undefined,
      placementLabel: prepared.composition?.placement.label,
      fallbackReason: prepared.fallbackReason,
    },
  };
}

async function prepareRenderInput(input: RenderAfterInput): Promise<{
  image: ParsedImageData;
  prompt: string;
  mode: "openai-image-edit" | "product-composite-edit";
  composition?: ProductCompositionResult;
  fallbackReason?: string;
}> {
  const stylePrompt = buildAfterImagePrompt({
    concept: input.concept,
    userPrompt: input.userPrompt,
    keptFurniture: input.keptFurniture,
  });

  if (!input.productReference?.imageUrl) {
    return { image: input.image, prompt: stylePrompt, mode: "openai-image-edit" };
  }

  try {
    const composition = await composeProductImageOntoRoom(input.image.bytes, input.image.mimeType, input.productReference);
    return {
      image: { bytes: composition.bytes, mimeType: composition.mimeType },
      prompt: buildProductCompositePrompt({
        concept: input.concept,
        userPrompt: input.userPrompt,
        keptFurniture: input.keptFurniture,
        productReference: input.productReference,
        placementLabel: composition.placement.label,
      }),
      mode: "product-composite-edit",
      composition,
    };
  } catch (error) {
    return {
      image: input.image,
      prompt: stylePrompt,
      mode: "openai-image-edit",
      fallbackReason: error instanceof Error ? error.message : "상품 이미지 합성에 실패했습니다.",
    };
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as RenderAfterRequest;
  const normalized = normalizeRenderAfterRequest(body);

  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const prepared = await prepareRenderInput(normalized.input);

  if (!process.env.OPENAI_API_KEY) {
    if (prepared.composition) {
      return NextResponse.json(
        buildCompositePreviewResponse(
          normalized.input,
          prepared,
          "AI 보정 설정이 아직 준비되지 않아, AI 보정 없이 1차 상품 합성 이미지를 보여드립니다.",
        ),
        { status: 200 },
      );
    }

    const response: RenderAfterResponse = {
      imageUrl: null,
      prompt: prepared.prompt,
      mode: "mock-image-preview",
      provider: "mock",
      error: "AI 보정 설정이 아직 준비되지 않아 실제 이미지 보정은 건너뛰었습니다.",
      meta: {
        model: "none",
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
        productReferenceId: normalized.input.productReference?.id,
        fallbackReason: prepared.fallbackReason,
      },
    };
    return NextResponse.json(response, { status: 200 });
  }

  try {
    const result = await callOpenAIImageEdit({ image: prepared.image, prompt: prepared.prompt });
    const response: RenderAfterResponse = {
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      mode: prepared.mode,
      provider: "openai",
      meta: {
        model: OPENAI_IMAGE_MODEL,
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
        productReferenceId: normalized.input.productReference?.id,
        compositionMode: prepared.composition ? "single-product-preset" : undefined,
        placementLabel: prepared.composition?.placement.label,
        fallbackReason: prepared.fallbackReason,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (prepared.composition) {
      return NextResponse.json(
        buildCompositePreviewResponse(
          normalized.input,
          prepared,
          "AI 보정이 오래 걸려 1차 상품 합성 이미지를 먼저 보여드립니다. 상품 위치와 정체성을 먼저 확인해 주세요.",
        ),
        { status: 200 },
      );
    }

    const response: RenderAfterResponse = {
      imageUrl: null,
      prompt: prepared.prompt,
      mode: "mock-image-preview",
      provider: "mock",
      error: error instanceof Error ? error.message : "이미지 생성 중 알 수 없는 오류가 발생했습니다.",
      meta: {
        model: OPENAI_IMAGE_MODEL,
        conceptId: normalized.input.concept.id,
        generatedAt: new Date().toISOString(),
        productReferenceId: normalized.input.productReference?.id,
        fallbackReason: prepared.fallbackReason,
      },
    };

    return NextResponse.json(response, { status: 502 });
  }
}
