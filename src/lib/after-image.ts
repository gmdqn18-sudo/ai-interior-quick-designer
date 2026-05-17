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

function inferImageContext(input: { concept: DesignConcept; userPrompt: string }) {
  const text = `${input.concept.title} ${input.concept.strategy} ${input.userPrompt}`;
  if (hasAnyText(text, ["카페", "커피숍", "창업"])) return "Korean cafe commercial context: realistic customer seating, service counter, circulation, and purchase-realistic decor.";
  if (hasAnyText(text, ["오피스", "사무실", "회의실", "워크스페이스", "업무공간"])) return "Korean office workspace context: realistic desks, collaboration zones, storage, lighting, and employee circulation.";
  if (hasAnyText(text, ["쇼룸", "전시장", "전시 공간"])) return "Korean showroom retail context: realistic product display zones, customer circulation, accent lighting, and brand presentation.";
  if (hasAnyText(text, ["매장", "상점", "리테일", "편집샵", "샵", "업장"])) return "Korean retail store commercial context: realistic merchandising, customer circulation, lighting, and purchase-realistic decor.";
  if (hasAnyText(text, ["스튜디오", "촬영", "작업실"])) return "Korean studio workspace context: realistic work zones, equipment clearance, lighting, and storage.";
  if (hasAnyText(text, ["침실", "침대", "호텔식"])) return "Korean bedroom residential context: renter-friendly and realistic, with bed-area scale and circulation preserved.";
  if (hasAnyText(text, ["거실", "소파", "라운지"])) return "Korean living-room residential context: renter-friendly and realistic, with seating scale and circulation preserved.";
  return "Korean residential room context: renter-friendly and realistic, based on the user's prompt rather than a fixed bedroom or studio-apartment default.";
}

function hasAnyText(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function buildAfterImagePrompt(input: {
  concept: DesignConcept;
  userPrompt: string;
  keptFurniture: string[];
}) {
  const productNames = input.concept.products.slice(0, 6).map((product) => `${product.category}: ${product.name}`);
  const keptFurnitureText = input.keptFurniture.length > 0 ? input.keptFurniture.join(", ") : "no specific furniture";
  const highlights = input.concept.highlights.join(", ");
  const imageContext = inferImageContext(input);

  return [
    "Use the provided room photo as the locked reference frame for an image-to-image interior edit.",
    "CRITICAL: keep the exact same camera position, camera height, lens perspective, field of view, crop, and viewing angle as the input photo.",
    "Do not rotate, zoom in, zoom out, reframe, change to eye-level, change to a catalog/product-shot angle, or create a different room.",
    "Preserve the original room geometry and fixed architecture: walls, floor, ceiling lines, door, window, radiator, curtain rail, built-in structures, and visible room boundaries.",
    "Preserve the real placement scale of major furniture unless explicitly replaced: bed area, desk/chair zone, wardrobe/storage zone, and circulation paths must stay recognizable from the original photo.",
    "Edit the existing room in-place: declutter, recolor, restyle, add realistic renter-friendly decor and purchasable items, but keep the Before/After comparable from the same shot.",
    imageContext,
    `Design concept title: ${input.concept.title}`,
    `Design strategy: ${input.concept.strategy}`,
    `User requested mood and constraints: ${input.userPrompt || "use only the selected concept, retained furniture, and analyzed room constraints; do not invent an extra default style"}`,
    `Furniture to keep and visually retain in the same approximate location: ${keptFurnitureText}`,
    `Key highlights: ${highlights}`,
    `Recommended items to reflect visually: ${productNames.join("; ")}`,
    "Make the edited space cleaner, staged, and purchase-realistic, not an unrelated luxury reference scene.",
    "The final image must feel like the same photo after interior changes, not a newly photographed reference room.",
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
