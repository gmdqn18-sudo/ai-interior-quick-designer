import type { DesignConcept } from "./interior-design";

export type RenderAfterImageMode = "openai-image-edit" | "mock-image-preview";

export type RenderAfterRequest = {
  imageDataUrl?: unknown;
  concept?: unknown;
  userPrompt?: unknown;
  keptFurniture?: unknown;
};

export type ParsedImageData = {
  mimeType: string;
  bytes: Uint8Array;
};

export type RenderAfterInput = {
  image: ParsedImageData;
  concept: DesignConcept;
  userPrompt: string;
  keptFurniture: string[];
};

export type RenderAfterResponse = {
  imageUrl: string | null;
  prompt: string;
  mode: RenderAfterImageMode;
  provider: "openai" | "mock";
  error?: string;
  meta: {
    model: string;
    conceptId: string;
    generatedAt: string;
  };
};

type NormalizedRenderAfterRequest =
  | { ok: true; input: RenderAfterInput }
  | { ok: false; error: string };

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function isDesignConcept(value: unknown): value is DesignConcept {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "title" in value &&
      "strategy" in value &&
      "products" in value &&
      Array.isArray((value as DesignConcept).products),
  );
}

export function imageDataUrlToBlobParts(imageDataUrl: string): ParsedImageData {
  const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("지원하지 않는 이미지 형식입니다. PNG, JPEG, WEBP 이미지만 사용할 수 있습니다.");
  }

  const mimeType = match[1];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }

  return {
    mimeType,
    bytes: Uint8Array.from(Buffer.from(match[2], "base64")),
  };
}

export function buildAfterImagePrompt(input: {
  concept: DesignConcept;
  userPrompt: string;
  keptFurniture: string[];
}) {
  const productNames = input.concept.products.slice(0, 6).map((product) => `${product.category}: ${product.name}`);
  const keptFurnitureText = input.keptFurniture.length > 0 ? input.keptFurniture.join(", ") : "no specific furniture";
  const highlights = input.concept.highlights.join(", ");

  return [
    "Create a photorealistic interior redesign image based on the provided room photo.",
    "Preserve the original room layout, camera angle, walls, doors, windows, and major fixed architecture.",
    "This is a Korean small room / bedroom / studio apartment context, renter-friendly and realistic.",
    `Design concept title: ${input.concept.title}`,
    `Design strategy: ${input.concept.strategy}`,
    `User requested mood and constraints: ${input.userPrompt || "budget-friendly warm minimal room"}`,
    `Furniture to keep and visually retain: ${keptFurnitureText}`,
    `Key highlights: ${highlights}`,
    `Recommended items to reflect visually: ${productNames.join("; ")}`,
    "Make the room look cleaner, staged, and purchase-realistic, not a luxury mansion.",
    "Remove visual clutter where reasonable, but do not change the room into a different space.",
    "No text, no labels, no watermark, no people, no extra UI elements.",
  ].join("\n");
}

export function normalizeRenderAfterRequest(body: RenderAfterRequest): NormalizedRenderAfterRequest {
  if (typeof body.imageDataUrl !== "string" || body.imageDataUrl.length < 30) {
    return { ok: false, error: "원본 방 사진이 필요합니다." };
  }

  if (!isDesignConcept(body.concept)) {
    return { ok: false, error: "선택한 시안 정보가 올바르지 않습니다." };
  }

  try {
    const image = imageDataUrlToBlobParts(body.imageDataUrl);
    const userPrompt = typeof body.userPrompt === "string" ? body.userPrompt.slice(0, 800) : "";
    const keptFurniture = Array.isArray(body.keptFurniture)
      ? body.keptFurniture.filter((item): item is string => typeof item === "string").slice(0, 10)
      : [];

    return {
      ok: true,
      input: {
        image,
        concept: body.concept,
        userPrompt,
        keptFurniture,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "이미지 데이터를 읽지 못했습니다." };
  }
}
