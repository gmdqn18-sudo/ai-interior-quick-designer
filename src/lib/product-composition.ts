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

export type ProductCompositionResult = {
  bytes: Uint8Array;
  mimeType: "image/png";
  placement: ProductCompositionPlacement;
  roomSize: { width: number; height: number };
  productSize: { width: number; height: number };
};

export type ComposeProductImageOptions = {
  fetchImpl?: typeof fetch;
  maxProductImageBytes?: number;
};

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

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

  const response = await (options.fetchImpl ?? fetch)(product.imageUrl, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8" },
  });

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

export async function composeProductImageOntoRoom(
  roomImageBytes: Uint8Array,
  roomMimeType: string,
  product: ProductReference,
  options: ComposeProductImageOptions = {},
): Promise<ProductCompositionResult> {
  if (!product.imageUrl) {
    throw new Error("상품 이미지 URL이 필요합니다.");
  }

  const room = sharp(Buffer.from(roomImageBytes), { failOn: "none" }).rotate();
  const roomMetadata = await room.metadata();
  const roomWidth = roomMetadata.width;
  const roomHeight = roomMetadata.height;
  if (!roomWidth || !roomHeight) {
    throw new Error("원본 방 사진 크기를 확인하지 못했습니다.");
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

  const shadow = await sharp({
    create: {
      width: productWidth,
      height: Math.max(8, Math.round(productHeight * 0.08)),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.22 },
    },
  })
    .blur(Math.max(4, Math.round(productWidth * 0.025)))
    .png()
    .toBuffer();

  const output = await room
    .png()
    .composite([
      {
        input: shadow,
        left,
        top: clampPosition(top + productHeight - Math.round(productHeight * 0.04), Math.max(8, Math.round(productHeight * 0.08)), roomHeight),
        blend: "over",
      },
      { input: productPng, left, top, blend: "over" },
    ])
    .png()
    .toBuffer();

  return {
    bytes: Uint8Array.from(output),
    mimeType: "image/png",
    placement,
    roomSize: { width: roomWidth, height: roomHeight },
    productSize: { width: productWidth, height: productHeight },
  };
}
