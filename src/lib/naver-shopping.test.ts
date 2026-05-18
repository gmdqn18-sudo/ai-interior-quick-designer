import * as assert from "node:assert/strict";
import { test } from "node:test";

import { mapNaverShoppingItemToProduct, searchNaverShopping } from "./naver-shopping";
import type { ProductSearchQuery } from "./product-search";

const query: ProductSearchQuery = {
  query: "카페 펜던트 조명 블랙 모던",
  targetCategory: "조명",
  spaceType: "cafe",
  spaceLabel: "카페",
  styleTags: ["dark-modern"],
  styleLabel: "블랙 모던",
  intentTags: ["commercial", "lighting", "dark-modern"],
};

test("mapNaverShoppingItemToProduct maps Naver Shopping fields into Product snapshot fields", () => {
  const product = mapNaverShoppingItemToProduct(
    {
      title: "<b>블랙</b> 펜던트 조명",
      link: "https://search.shopping.naver.com/catalog/123",
      image: "https://example.com/light.jpg",
      lprice: "59000",
      mallName: "조명몰",
      productId: "123",
      maker: "maker",
      brand: "brand",
      category1: "가구/인테리어",
      category2: "조명",
    },
    query,
    "2026-05-18T00:00:00.000Z",
  );

  assert.ok(product);
  assert.equal(product.id, "naver-123");
  assert.equal(product.name, "블랙 펜던트 조명");
  assert.equal(product.source, "네이버쇼핑");
  assert.equal(product.linkType, "naver-shopping-result");
  assert.equal(product.price, 59000);
  assert.equal(product.mallName, "조명몰");
  assert.equal(product.imageUrl, "https://example.com/light.jpg");
  assert.equal(product.category, "조명");
  assert.equal(product.provider, "naver-shopping");
  assert.equal(product.searchQuery, query.query);
  assert.equal(product.availabilityNote, "가격/재고 변동 가능");
});

test("searchNaverShopping keeps credentials server-side and returns mapped products", async () => {
  const requests: { url: string; headers: Headers }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), headers: new Headers(init?.headers) });
    return new Response(
      JSON.stringify({
        total: 1,
        start: 1,
        display: 1,
        items: [
          {
            title: "카페 테이블",
            link: "https://search.shopping.naver.com/catalog/456",
            lprice: "120000",
            mallName: "가구몰",
            productId: "456",
            category1: "가구/인테리어",
            category2: "테이블",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const products = await searchNaverShopping(query, {
    clientId: "client-id",
    clientSecret: "client-secret",
    display: 1,
    fetchImpl,
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].source, "네이버쇼핑");
  assert.ok(requests[0].url.includes("openapi.naver.com/v1/search/shop.json"));
  assert.equal(requests[0].headers.get("X-Naver-Client-Id"), "client-id");
  assert.equal(requests[0].headers.get("X-Naver-Client-Secret"), "client-secret");
});
