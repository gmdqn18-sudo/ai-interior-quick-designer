import * as assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { composeProductImageOntoRoom, composeProductsImageOntoRoom, getProductCompositionPlacement, selectProductReferencesForComposition, type ProductReference } from "./product-composition";

async function pngBytes(width: number, height: number, color: string) {
  return Uint8Array.from(await sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer());
}

function responseFromBytes(bytes: Uint8Array, contentType = "image/png") {
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

const product: ProductReference = {
  id: "naver-test-rug",
  name: "테스트 실제 러그",
  category: "러그",
  imageUrl: "https://example.com/rug.png",
  source: "네이버쇼핑",
  url: "https://example.com/product",
};

test("getProductCompositionPlacement uses simple category presets", () => {
  assert.equal(getProductCompositionPlacement("러그").label, "바닥 중앙");
  assert.equal(getProductCompositionPlacement("조명").label, "우측 코너");
  assert.equal(getProductCompositionPlacement("수납").label, "우측 하단");
});

test("selectProductReferencesForComposition prioritizes rug lamp storage and caps at three", () => {
  const products: ProductReference[] = [
    { ...product, id: "chair", category: "의자", name: "의자", imageUrl: "https://example.com/chair.png" },
    { ...product, id: "storage", category: "수납", name: "수납", imageUrl: "https://example.com/storage.png" },
    { ...product, id: "lamp", category: "조명", name: "조명", imageUrl: "https://example.com/lamp.png" },
    { ...product, id: "rug", category: "러그", name: "러그", imageUrl: "https://example.com/rug.png" },
  ];

  assert.deepEqual(selectProductReferencesForComposition(products).map((item) => item.id), ["rug", "lamp", "storage"]);
});

test("composeProductImageOntoRoom composites one real product image into the room frame", async () => {
  const room = await pngBytes(400, 300, "#f8fafc");
  const productImage = await pngBytes(120, 80, "#e11d48");

  const result = await composeProductImageOntoRoom(room, "image/png", product, {
    fetchImpl: async () => responseFromBytes(productImage),
  });

  assert.equal(result.mimeType, "image/png");
  assert.equal(result.roomSize.width, 400);
  assert.equal(result.roomSize.height, 300);
  assert.equal(result.placement.label, "바닥 중앙");
  assert.ok(result.productSize.width > 0);
  assert.ok(result.productSize.height > 0);
  assert.ok(result.bytes.byteLength > room.byteLength);
});

test("composeProductsImageOntoRoom composites up to three selected real product images", async () => {
  const room = await pngBytes(500, 360, "#f8fafc");
  const imageByUrl = new Map([
    ["https://example.com/rug.png", await pngBytes(140, 90, "#e11d48")],
    ["https://example.com/lamp.png", await pngBytes(80, 160, "#facc15")],
    ["https://example.com/storage.png", await pngBytes(120, 120, "#0f766e")],
  ]);
  const products: ProductReference[] = [
    { ...product, id: "storage", category: "수납", name: "실제 수납", imageUrl: "https://example.com/storage.png" },
    { ...product, id: "lamp", category: "조명", name: "실제 조명", imageUrl: "https://example.com/lamp.png" },
    { ...product, id: "rug", category: "러그", name: "실제 러그", imageUrl: "https://example.com/rug.png" },
  ];

  const result = await composeProductsImageOntoRoom(room, "image/png", products, {
    fetchImpl: async (url) => responseFromBytes(imageByUrl.get(String(url)) ?? (await pngBytes(10, 10, "#000000"))),
  });

  assert.equal(result.mimeType, "image/png");
  assert.equal(result.roomSize.width, 500);
  assert.deepEqual(result.placements.map((item) => item.productId), ["rug", "lamp", "storage"]);
  assert.deepEqual(result.placements.map((item) => item.placement.label), ["바닥 중앙", "우측 코너", "우측 하단"]);
  assert.ok(result.bytes.byteLength > room.byteLength);
});

test("composeProductImageOntoRoom rejects products without an image URL", async () => {
  const room = await pngBytes(200, 150, "#ffffff");
  await assert.rejects(
    () => composeProductImageOntoRoom(room, "image/png", { ...product, imageUrl: "" }),
    /상품 이미지 URL/,
  );
});

test("composeProductImageOntoRoom rejects local product image URLs before fetching", async () => {
  const room = await pngBytes(200, 150, "#ffffff");
  let fetched = false;

  await assert.rejects(
    () =>
      composeProductImageOntoRoom(room, "image/png", { ...product, imageUrl: "http://127.0.0.1/private.png" }, {
        fetchImpl: async () => {
          fetched = true;
          return responseFromBytes(await pngBytes(10, 10, "#000000"));
        },
      }),
    /HTTPS URL|허용되지 않는 상품 이미지 호스트/,
  );
  assert.equal(fetched, false);
});
