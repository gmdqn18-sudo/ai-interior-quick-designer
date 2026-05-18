import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import sharp from "sharp";

import type { Product } from "./interior-design";

export type ProductReference = Pick<Product, "id" | "name" | "category" | "imageUrl" | "source" | "url"> & {
  imageUrl: string;
};

export type ProductCompositionPlacement = {
  label: string;
  leftRatio: number;
  topRatio: number;
  widthRatio: number;
  maxHeightRatio: number;
};

export type ProductCompositionItemResult = {
  productId: string;
  productName: string;
  category: string;
  placement: ProductCompositionPlacement;
  productSize: { width: number; height: number };
};

export type ProductCompositionResult = {
  bytes: Uint8Array;
  mimeType: "image/png";
  placement: ProductCompositionPlacement;
  roomSize: { width: number; height: number };
  productSize: { width: number; height: number };
};

export type MultiProductCompositionResult = {
  bytes: Uint8Array;
  mimeType: "image/png";
  placements: ProductCompositionItemResult[];
  roomSize: { width: number; height: number };
};

export type ComposeProductImageOptions = {
  fetchImpl?: typeof fetch;
  maxProductImageBytes?: number;
  productImageFetchTimeoutMs?: number;
};

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_PRODUCT_IMAGE_FETCH_TIMEOUT_MS = 8_000;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);
const MAX_COMPOSITE_PRODUCTS = 3;

const COMPOSITE_CATEGORY_PRIORITY = ["러그", "조명", "수납", "침구", "패브릭", "커튼", "책상/테이블", "거실가구", "소품", "의자"];
const COMPOSITE_LAYER_ORDER = ["러그", "패브릭", "침구", "커튼", "책상/테이블", "거실가구", "수납", "의자", "소품", "조명"];

function categoryRank(category: string, order: string[]) {
  const index = order.indexOf(category);
  return index === -1 ? order.length : index;
}

export function selectProductReferencesForComposition<T extends ProductReference>(products: T[], maxProducts = MAX_COMPOSITE_PRODUCTS): T[] {
  const limit = Math.max(1, Math.min(MAX_COMPOSITE_PRODUCTS, maxProducts));
  const withImages = products.filter((product) => Boolean(product.imageUrl));
  const picked: T[] = [];
  const usedCategories = new Set<string>();

  const tryPick = (product: T) => {
    if (picked.length >= limit) return;
    if (usedCategories.has(product.category)) return;
    picked.push(product);
    usedCategories.add(product.category);
  };

  for (const category of COMPOSITE_CATEGORY_PRIORITY) {
    const product = withImages.find((candidate) => candidate.category === category);
    if (product) tryPick(product);
    if (picked.length >= limit) break;
  }

  for (const product of withImages) {
    tryPick(product);
    if (picked.length >= limit) break;
  }

  return picked;
}

export function getProductCompositionPlacement(category: string): ProductCompositionPlacement {
  switch (category) {
    case "러그":
      return { label: "바닥 중앙", leftRatio: 0.28, topRatio: 0.62, widthRatio: 0.48, maxHeightRatio: 0.25 };
    case "조명":
      return { label: "우측 코너", leftRatio: 0.70, topRatio: 0.34, widthRatio: 0.18, maxHeightRatio: 0.38 };
    case "수납":
      return { label: "우측 하단", leftRatio: 0.68, topRatio: 0.52, widthRatio: 0.24, maxHeightRatio: 0.32 };
    case "의자":
      return { label: "하단 우측", leftRatio: 0.58, topRatio: 0.56, widthRatio: 0.24, maxHeightRatio: 0.32 };
    case "책상/테이블":
    case "거실가구":
      return { label: "하단 중앙", leftRatio: 0.38, topRatio: 0.56, widthRatio: 0.32, maxHeightRatio: 0.30 };
    case "커튼":
      return { label: "창가 영역", leftRatio: 0.40, topRatio: 0.16, widthRatio: 0.25, maxHeightRatio: 0.46 };
    case "침구":
    case "패브릭":
      return { label: "침대/좌식 영역", leftRatio: 0.24, topRatio: 0.56, widthRatio: 0.32, maxHeightRatio: 0.28 };
    case "소품":
      return { label: "중단 포인트", leftRatio: 0.70, topRatio: 0.36, widthRatio: 0.18, maxHeightRatio: 0.24 };
    default:
      return { label: "하단 중앙", leftRatio: 0.40, topRatio: 0.55, widthRatio: 0.28, maxHeightRatio: 0.30 };
  }
}

function clampPosition(value: number, size: number, max: number) {
  return Math.max(0, Math.min(Math.round(value), Math.max(0, max - size)));
}

function stripIpv6Brackets(hostname: string) {
  return hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string) {
  const value = stripIpv6Brackets(hostname);
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
}

function isBlockedHostname(hostname: string) {
  const value = stripIpv6Brackets(hostname);
  return BLOCKED_HOSTNAMES.has(value) || value.endsWith(".localhost") || value.endsWith(".local") || value.endsWith(".internal");
}

async function assertSafeProductImageUrl(imageUrl: string, skipDnsLookup: boolean) {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("상품 이미지 URL 형식이 올바르지 않습니다.");
  }

  if (url.protocol !== "https:") {
    throw new Error("상품 이미지는 HTTPS URL만 사용할 수 있습니다.");
  }

  if (isBlockedHostname(url.hostname) || isPrivateIpv4(url.hostname) || isPrivateIpv6(url.hostname)) {
    throw new Error("허용되지 않는 상품 이미지 호스트입니다.");
  }

  if (isIP(stripIpv6Brackets(url.hostname))) return;
  if (skipDnsLookup) return;

  const addresses = await lookup(url.hostname, { all: true, verbatim: false });
  if (addresses.some(({ address }) => isPrivateIpv4(address) || isPrivateIpv6(address))) {
    throw new Error("상품 이미지 호스트가 내부 네트워크 주소로 확인되었습니다.");
  }
}

async function fetchProductImage(product: ProductReference, options: ComposeProductImageOptions) {
  await assertSafeProductImageUrl(product.imageUrl, Boolean(options.fetchImpl));

  const controller = new AbortController();
  const timeoutMs = Math.min(15_000, Math.max(2_000, options.productImageFetchTimeoutMs ?? DEFAULT_PRODUCT_IMAGE_FETCH_TIMEOUT_MS));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await (options.fetchImpl ?? fetch)(product.imageUrl, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8" },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`상품 이미지를 가져오지 못했습니다. (${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
  if (contentType && !ALLOWED_PRODUCT_IMAGE_TYPES.has(contentType)) {
    throw new Error("지원하지 않는 상품 이미지 형식입니다.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const maxBytes = options.maxProductImageBytes ?? MAX_PRODUCT_IMAGE_BYTES;
  if (buffer.byteLength <= 0 || buffer.byteLength > maxBytes) {
    throw new Error("상품 이미지 크기가 MVP 합성 범위를 벗어났습니다.");
  }
  return buffer;
}

async function prepareProductOverlay(product: ProductReference, roomWidth: number, roomHeight: number, options: ComposeProductImageOptions) {
  if (!product.imageUrl) {
    throw new Error("상품 이미지 URL이 필요합니다.");
  }

  const productBuffer = await fetchProductImage(product, options);
  const placement = getProductCompositionPlacement(product.category);
  const targetWidth = Math.max(48, Math.round(roomWidth * placement.widthRatio));
  const targetMaxHeight = Math.max(48, Math.round(roomHeight * placement.maxHeightRatio));

  const productPng = await sharp(productBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: targetWidth, height: targetMaxHeight, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const productMetadata = await sharp(productPng).metadata();
  const productWidth = productMetadata.width ?? targetWidth;
  const productHeight = productMetadata.height ?? targetMaxHeight;

  const left = clampPosition(roomWidth * placement.leftRatio, productWidth, roomWidth);
  const top = clampPosition(roomHeight * placement.topRatio, productHeight, roomHeight);
  const shadowHeight = Math.max(8, Math.round(productHeight * 0.08));
  const shadow = await sharp({
    create: {
      width: productWidth,
      height: shadowHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.22 },
    },
  })
    .blur(Math.max(4, Math.round(productWidth * 0.025)))
    .png()
    .toBuffer();

  return {
    product,
    placement,
    productPng,
    productWidth,
    productHeight,
    shadow,
    left,
    top,
    shadowTop: clampPosition(top + productHeight - Math.round(productHeight * 0.04), shadowHeight, roomHeight),
  };
}

export async function composeProductsImageOntoRoom(
  roomImageBytes: Uint8Array,
  roomMimeType: string,
  products: ProductReference[],
  options: ComposeProductImageOptions = {},
): Promise<MultiProductCompositionResult> {
  const selectedProducts = selectProductReferencesForComposition(products);
  if (selectedProducts.length === 0) {
    throw new Error("상품 이미지 URL이 있는 합성 대상이 필요합니다.");
  }

  const room = sharp(Buffer.from(roomImageBytes), { failOn: "none" }).rotate();
  const roomMetadata = await room.metadata();
  const roomWidth = roomMetadata.width;
  const roomHeight = roomMetadata.height;
  if (!roomWidth || !roomHeight) {
    throw new Error("원본 방 사진 크기를 확인하지 못했습니다.");
  }

  const roomPng = await room.png().toBuffer();
  const overlays = await Promise.all(
    selectedProducts
      .slice()
      .sort((a, b) => categoryRank(a.category, COMPOSITE_LAYER_ORDER) - categoryRank(b.category, COMPOSITE_LAYER_ORDER))
      .map((product) => prepareProductOverlay(product, roomWidth, roomHeight, options)),
  );

  const compositeInputs = overlays.flatMap((overlay) => [
    { input: overlay.shadow, left: overlay.left, top: overlay.shadowTop, blend: "over" as const },
    { input: overlay.productPng, left: overlay.left, top: overlay.top, blend: "over" as const },
  ]);

  const output = await sharp(roomPng, { failOn: "none" }).composite(compositeInputs).png().toBuffer();
  const placementOrder = new Map(selectedProducts.map((product, index) => [product.id, index]));

  return {
    bytes: Uint8Array.from(output),
    mimeType: "image/png",
    roomSize: { width: roomWidth, height: roomHeight },
    placements: overlays
      .map((overlay) => ({
        productId: overlay.product.id,
        productName: overlay.product.name,
        category: overlay.product.category,
        placement: overlay.placement,
        productSize: { width: overlay.productWidth, height: overlay.productHeight },
      }))
      .sort((a, b) => (placementOrder.get(a.productId) ?? 0) - (placementOrder.get(b.productId) ?? 0)),
  };
}

export async function composeProductImageOntoRoom(
  roomImageBytes: Uint8Array,
  roomMimeType: string,
  product: ProductReference,
  options: ComposeProductImageOptions = {},
): Promise<ProductCompositionResult> {
  const result = await composeProductsImageOntoRoom(roomImageBytes, roomMimeType, [product], options);
  const first = result.placements[0];
  if (!first) {
    throw new Error("상품 이미지 URL이 필요합니다.");
  }

  return {
    bytes: result.bytes,
    mimeType: result.mimeType,
    placement: first.placement,
    roomSize: result.roomSize,
    productSize: first.productSize,
  };
}
