import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DesignGenerationRequest } from "./design-api";
import { productPool } from "./interior-design";
import { buildProductSearchQueries, resolveProductCandidatesForDesign } from "./product-search";

const request: DesignGenerationRequest = {
  budget: 500000,
  prompt: "카페를 블랙 모던으로 창업하려고 합니다. 바 좌석과 조명이 필요해요.",
  generation: 1,
  keptFurniture: [],
  roomAnalysis: null,
};

test("buildProductSearchQueries generates space and style specific Naver Shopping queries", () => {
  const cafeQueries = buildProductSearchQueries(request);
  const officeQueries = buildProductSearchQueries({
    ...request,
    prompt: "오피스를 쿨톤 미니멀하게 바꾸고 싶어요. 데스크와 수납이 필요합니다.",
  });

  assert.ok(cafeQueries.length >= 4 && cafeQueries.length <= 6);
  assert.ok(cafeQueries.every((query) => query.spaceType === "cafe"));
  assert.ok(cafeQueries.some((query) => query.query.includes("카페")));
  assert.ok(cafeQueries.some((query) => query.query.includes("블랙 모던")));
  assert.ok(officeQueries.every((query) => query.spaceType === "office"));
  assert.ok(officeQueries.some((query) => query.query.includes("오피스")));
  assert.notDeepEqual(cafeQueries.map((query) => query.query), officeQueries.map((query) => query.query));
});

test("resolveProductCandidatesForDesign falls back to productPool when Naver credentials are missing", async () => {
  const previousId = process.env.NAVER_SHOPPING_CLIENT_ID;
  const previousSecret = process.env.NAVER_SHOPPING_CLIENT_SECRET;
  delete process.env.NAVER_SHOPPING_CLIENT_ID;
  delete process.env.NAVER_SHOPPING_CLIENT_SECRET;

  try {
    const result = await resolveProductCandidatesForDesign(request);

    assert.equal(result.meta.status, "fallback");
    assert.equal(result.meta.provider, "static-catalog");
    assert.equal(result.products, productPool);
    assert.match(result.meta.notice, /실시간 검색 실패로 기본 카탈로그 추천/);
  } finally {
    if (previousId) process.env.NAVER_SHOPPING_CLIENT_ID = previousId;
    if (previousSecret) process.env.NAVER_SHOPPING_CLIENT_SECRET = previousSecret;
  }
});

test("resolveProductCandidatesForDesign uses live candidates before fallback when Naver search succeeds", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        total: 12,
        start: 1,
        display: 12,
        items: Array.from({ length: 12 }, (_, index) => ({
          title: `라이브 카페 상품 ${index + 1}`,
          link: `https://search.shopping.naver.com/catalog/${index + 1}`,
          lprice: String(20000 + index * 1000),
          mallName: "네이버몰",
          productId: `live-${index + 1}`,
          category1: "가구/인테리어",
        })),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await resolveProductCandidatesForDesign(request, undefined, {
    clientId: "client-id",
    clientSecret: "client-secret",
    fetchImpl,
    display: 12,
    minLiveProducts: 10,
    maxQueries: 1,
  });

  assert.equal(result.meta.status, "live");
  assert.equal(result.meta.provider, "naver-shopping");
  assert.equal(result.products.length, 12);
  assert.ok(result.products.every((product) => product.source === "네이버쇼핑"));
});
