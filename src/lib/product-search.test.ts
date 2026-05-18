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

test("buildProductSearchQueries uses residential shopping labels instead of broad 주거 labels", () => {
  const queries = buildProductSearchQueries({
    ...request,
    prompt: "월세 원룸을 깔끔하고 따뜻한 우드톤으로 꾸미고 싶습니다. 침구, 조명, 러그, 수납을 예산 안에서 추천해주세요.",
  });

  assert.ok(queries.every((query) => query.spaceLabel === "원룸"));
  assert.ok(queries.every((query) => query.query.includes("원룸")));
  assert.ok(queries.every((query) => !query.query.includes("주거")));
});

test("resolveProductCandidatesForDesign supplements live results when requested residential slots are missing", async () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    title: `원룸 베이지 매트리스 커버 세트 ${index + 1}`,
    link: `https://smartstore.naver.com/bedding/products/${index + 1}`,
    lprice: String(40000 + index * 1000),
    mallName: "침구몰",
    productId: `bedding-${index + 1}`,
    category1: "가구/인테리어",
  }));
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ total: items.length, start: 1, display: items.length, items }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const result = await resolveProductCandidatesForDesign(
    {
      ...request,
      prompt: "월세 원룸을 깔끔하고 따뜻한 우드톤으로 꾸미고 싶습니다. 침구, 조명, 러그, 수납을 예산 안에서 추천해주세요.",
    },
    undefined,
    { clientId: "client-id", clientSecret: "client-secret", fetchImpl, display: items.length, minLiveProducts: 10 },
  );

  assert.equal(result.meta.status, "partial-fallback");
  assert.ok(result.products.some((product) => product.category === "러그"), "missing requested rug slot should be supplemented from fallback catalog");
  assert.ok(result.products.some((product) => product.category === "수납"), "missing requested storage slot should be supplemented from fallback catalog");
  assert.ok(result.products.some((product) => product.category === "조명"), "missing requested lighting slot should be supplemented from fallback catalog");
});

test("resolveProductCandidatesForDesign filters negative shopping results and dedupes normalized product identities", async () => {
  const items = [
    {
      title: "터치기본가디건 하객룩 데일리룩 오피스룩 가디건",
      link: "https://search.shopping.naver.com/catalog/fashion",
      lprice: "22000",
      mallName: "네이버",
      productId: "fashion-1",
      category1: "패션의류",
    },
    {
      title: "화이트 그레이 사무용 데스크 책상 1200",
      link: "https://smartstore.naver.com/office/products/desk-1",
      lprice: "180000",
      mallName: "오피스몰",
      productId: "desk-1",
      category1: "가구/인테리어",
    },
    {
      title: "화이트 그레이 사무용 데스크 책상 1200",
      link: "https://smartstore.naver.com/office/products/desk-1?NaPm=duplicate",
      lprice: "180000",
      mallName: "오피스몰",
      productId: "desk-1-dup",
      category1: "가구/인테리어",
    },
    {
      title: "화이트 사무실 LED 조명 스탠드",
      link: "https://smartstore.naver.com/office/products/light-1",
      lprice: "42000",
      mallName: "조명몰",
      productId: "light-1",
      category1: "가구/인테리어",
    },
    {
      title: "사무실 수납 캐비닛 정리대",
      link: "https://smartstore.naver.com/office/products/storage-1",
      lprice: "90000",
      mallName: "수납몰",
      productId: "storage-1",
      category1: "가구/인테리어",
    },
  ];
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ total: items.length, start: 1, display: items.length, items }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const result = await resolveProductCandidatesForDesign(
    {
      ...request,
      prompt: "작은 4인 오피스를 꾸미려고 합니다. 화이트와 그레이 중심의 미니멀한 분위기로 책상, 의자, 수납, 조명을 추천해주세요.",
    },
    undefined,
    { clientId: "client-id", clientSecret: "client-secret", fetchImpl, display: items.length, minLiveProducts: 3, maxQueries: 1 },
  );

  assert.equal(result.meta.status, "live");
  assert.ok(result.products.every((product) => !/가디건|오피스룩|하객룩|데일리룩/.test(product.name)));
  assert.equal(result.products.filter((product) => product.name === "화이트 그레이 사무용 데스크 책상 1200").length, 1);
  assert.ok(result.products.some((product) => product.name.includes("조명")));
  assert.ok(result.products.some((product) => product.name.includes("수납")));
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
