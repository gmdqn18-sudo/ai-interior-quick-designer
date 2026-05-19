import type { DesignConcept } from "./interior-design";
import type { ProductReference } from "./product-composition";

export type RenderAfterImageMode = "openai-image-edit" | "product-composite-edit" | "product-composite-preview" | "mock-image-preview";
export type RenderAfterProvider = "openai" | "openrouter";

export type RenderAfterRequest = {
  imageDataUrl?: unknown;
  concept?: unknown;
  userPrompt?: unknown;
  keptFurniture?: unknown;
  productReference?: unknown;
  productReferences?: unknown;
  provider?: unknown;
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
  productReference?: ProductReference;
  productReferences?: ProductReference[];
  provider?: RenderAfterProvider;
};

export type RenderAfterResponse = {
  imageUrl: string | null;
  productCompositePreviewImageUrl?: string;
  prompt: string;
  mode: RenderAfterImageMode;
  provider: RenderAfterProvider | "server-composite" | "mock";
  error?: string;
  meta: {
    model: string;
    conceptId: string;
    generatedAt: string;
    productReferenceId?: string;
    productReferenceIds?: string[];
    compositionMode?: "single-product-preset" | "multi-product-preset";
    placementLabel?: string;
    placementLabels?: string[];
    fallbackReason?: string;
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

function isProductReference(value: unknown): value is ProductReference {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ProductReference).id === "string" &&
      typeof (value as ProductReference).name === "string" &&
      typeof (value as ProductReference).category === "string" &&
      typeof (value as ProductReference).imageUrl === "string" &&
      typeof (value as ProductReference).source === "string" &&
      typeof (value as ProductReference).url === "string" &&
      (value as ProductReference).imageUrl.startsWith("http"),
  );
}

function sanitizeProductReference(product: ProductReference): ProductReference {
  return {
    id: product.id.slice(0, 120),
    name: product.name.slice(0, 160),
    category: product.category.slice(0, 40),
    imageUrl: product.imageUrl,
    source: product.source.slice(0, 40) as ProductReference["source"],
    url: product.url,
  };
}

function normalizeRenderAfterProvider(provider: unknown): RenderAfterProvider | undefined {
  return provider === "openai" || provider === "openrouter" ? provider : undefined;
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
    "STRICT PRESERVATION GOAL: this is not a room redesign or a new interior rendering; it is a same-photo product/lighting retouch.",
    "CRITICAL: keep the exact same camera position, camera height, lens perspective, field of view, crop, and viewing angle as the input photo.",
    "Do not rotate, zoom in, zoom out, reframe, change to eye-level, change to a catalog/product-shot angle, or create a different room.",
    "Preserve the original room geometry and fixed architecture: walls, floor, ceiling lines, door, window, radiator, curtain rail, built-in structures, and visible room boundaries.",
    "Preserve the original wall and floor materials, window shape, existing furniture silhouettes, furniture positions, object scale, and circulation paths unless the user explicitly asked to remove or replace them.",
    "Preserve the real placement scale of major furniture unless explicitly replaced: bed area, desk/chair zone, wardrobe/storage zone, and circulation paths must stay recognizable from the original photo.",
    "Only make minimal in-place changes needed for color balance, natural shadows, lighting integration, mild decluttering, and realistic renter-friendly decor; do not invent a new layout, new windows, new walls, or new large furniture.",
    "Keep the output close to the input photo, not a polished catalog remake; preserve existing furniture and architecture even if they are imperfect.",
    "Edit the existing room in-place and keep the Before/After comparable from the same shot.",
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

export function buildProductCompositePrompt(input: {
  concept: DesignConcept;
  userPrompt: string;
  keptFurniture: string[];
  productReference: ProductReference;
  placementLabel?: string;
}) {
  return buildMultiProductCompositePrompt({
    concept: input.concept,
    userPrompt: input.userPrompt,
    keptFurniture: input.keptFurniture,
    productReferences: [input.productReference],
    placementLabels: input.placementLabel ? [input.placementLabel] : undefined,
  });
}

export function buildMultiProductCompositePrompt(input: {
  concept: DesignConcept;
  userPrompt: string;
  keptFurniture: string[];
  productReferences: ProductReference[];
  placementLabels?: string[];
}) {
  const keptFurnitureText = input.keptFurniture.length > 0 ? input.keptFurniture.join(", ") : "no specific furniture";
  const imageContext = inferImageContext(input);
  const productLines = input.productReferences
    .slice(0, 3)
    .map((product, index) => {
      const placement = input.placementLabels?.[index] ?? "preset placement";
      return `${index + 1}. ${product.category}: ${product.name} — pre-composited area: ${placement}`;
    });

  return [
    "Use the provided room photo as a pre-composited image: the real product images are already placed on top of the original room photo and must remain in the same positions.",
    "STRICT PRESERVATION GOAL: this is not a redesign request. It is a same-photo harmonization pass for already-composited products.",
    `There are ${productLines.length} selected real product image${productLines.length > 1 ? "s" : ""} to preserve:`,
    "CRITICAL MULTI-PRODUCT LOCK: preserve every listed product exactly as a visible product in the input image.",
    "Do not alter any product identity, silhouette, color, pattern, proportions, logo, material cues, or visible details.",
    "Do not replace any product with a similar item and do not hallucinate new products.",
    "Only harmonize lighting, contact shadows, color temperature, edge blending, and subtle spatial ambience around the already-placed products.",
    "Keep the output nearly pixel-identical to the input composite except for those lighting, shadow, color, and edge-blending corrections.",
    "Do not make the room prettier by redesigning it; do not add beds, desks, blinds, lamps, cabinets, rugs, props, or decor that are not already visible in the input composite.",
    "Do not redraw the room, do not change the room layout, and do not remove or move existing furniture, windows, walls, floor, or large objects from the input image.",
    "Keep the exact same camera position, lens perspective, field of view, crop, and room geometry as the input photo.",
    "Preserve fixed architecture: walls, floor, ceiling lines, door, window, built-in structures, and visible room boundaries.",
    "Preserve existing furniture silhouettes and positions unless a listed pre-composited product is already covering that exact area.",
    imageContext,
    "Selected real products to preserve:",
    productLines.join("\n"),
    `Design concept title: ${input.concept.title}`,
    `User requested mood and constraints: ${input.userPrompt || "use the selected concept and retained furniture; do not invent an extra default style"}`,
    `Furniture to keep and visually retain in the same approximate location: ${keptFurnitureText}`,
    "The result is a real-product identity preservation test, not a free redesign. If anything conflicts, prioritize preserving all selected products over making the room prettier.",
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
    const productReference = isProductReference(body.productReference)
      ? sanitizeProductReference(body.productReference)
      : undefined;
    const productReferences = Array.isArray(body.productReferences)
      ? body.productReferences.filter(isProductReference).slice(0, 3).map(sanitizeProductReference)
      : productReference
        ? [productReference]
        : undefined;
    const provider = normalizeRenderAfterProvider(body.provider);

    return {
      ok: true,
      input: {
        image,
        concept: body.concept,
        userPrompt,
        keptFurniture,
        productReference,
        productReferences,
        provider,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "이미지 데이터를 읽지 못했습니다." };
  }
}
