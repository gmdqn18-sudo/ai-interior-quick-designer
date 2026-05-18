import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DesignGenerationRequest, RoomAnalysis } from "./design-api";
import type { Product } from "./interior-design";
import type { ProductSearchMeta } from "./product-search";
import { composeDesignGenerationJob } from "./design-generation";

const livingRoomAnalysis: RoomAnalysis = {
  id: "analysis_shared_pipe",
  createdAt: "2026-05-16T00:00:00.000Z",
  source: "mock-vision",
  file: { name: "living.jpg", type: "image/jpeg", size: 1_200_000 },
  summary: "거실, 좋은 채광, 정돈된 상태",
  roomType: "거실",
  lightLevel: "좋음",
  clutterLevel: "낮음",
  dominantTones: ["화이트", "블랙", "실버"],
  detectedFurniture: ["소파", "커튼", "조명"],
  constraints: ["기존 소파 유지"],
  opportunities: ["러그와 테이블로 휴식 영역을 또렷하게 만들기"],
  recommendedPromptAdditions: ["쿨 화이트 블랙 톤 유지", "거실 중앙 휴식 영역 강화"],
  confidenceScore: 90,
};

const request: DesignGenerationRequest = {
  budget: 700000,
  prompt: "거실을 블랙 그레이 톤의 차분한 모던 라운지처럼 꾸미고 싶어요",
  generation: 3,
  keptFurniture: ["소파"],
  roomAnalysis: livingRoomAnalysis,
};

test("composeDesignGenerationJob gives server and browser fallback the same recommendation pipe", () => {
  const serverJob = composeDesignGenerationJob(request, {
    id: "job_server",
    createdAt: "2026-05-17T00:00:00.000Z",
    mode: "real-product-composition",
  });
  const browserFallbackJob = composeDesignGenerationJob(request, {
    id: "job_browser",
    createdAt: "2026-05-17T00:00:01.000Z",
    mode: "browser-fallback",
  });

  assert.equal(serverJob.mode, "real-product-composition");
  assert.equal(browserFallbackJob.mode, "browser-fallback");
  assert.deepEqual(
    browserFallbackJob.concepts.map((concept) => ({
      title: concept.title,
      strategy: concept.strategy,
      highlights: concept.highlights,
      productIds: concept.products.map((product) => product.id),
      usedBudget: concept.usedBudget,
      palette: concept.palette,
    })),
    serverJob.concepts.map((concept) => ({
      title: concept.title,
      strategy: concept.strategy,
      highlights: concept.highlights,
      productIds: concept.products.map((product) => product.id),
      usedBudget: concept.usedBudget,
      palette: concept.palette,
    })),
  );
  assert.deepEqual(browserFallbackJob.metrics, serverJob.metrics);
});

test("composeDesignGenerationJob stores selected live product snapshots and product search meta", () => {
  const liveProducts: Product[] = Array.from({ length: 4 }, (_, index) => ({
    id: `naver-snapshot-${index + 1}`,
    externalId: `snapshot-${index + 1}`,
    name: `네이버 스냅샷 상품 ${index + 1}`,
    category: index % 2 === 0 ? "조명" : "가구",
    price: 50000 + index * 10000,
    source: "네이버쇼핑",
    url: `https://search.shopping.naver.com/catalog/snapshot-${index + 1}`,
    linkType: "naver-shopping-result",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    reason: "생성 시점에 선택된 네이버 쇼핑 상품 후보입니다.",
    provider: "naver-shopping",
    searchQuery: "카페 조명 블랙 모던",
    availabilityNote: "가격/재고 변동 가능",
  }));
  const productSearchMeta: ProductSearchMeta = {
    provider: "naver-shopping",
    status: "live",
    queries: [],
    fetchedAt: "2026-05-18T00:00:00.000Z",
    apiCallCount: 1,
    notice: "네이버 쇼핑 실시간 검색 결과를 기반으로 생성 시점의 상품 후보를 저장했습니다. 가격/재고는 외부 쇼핑몰 사정에 따라 변동될 수 있습니다.",
  };

  const job = composeDesignGenerationJob(
    {
      ...request,
      prompt: "카페를 블랙 모던으로 꾸미고 싶어요",
      budget: 300000,
    },
    {
      id: "job_live_snapshot",
      createdAt: "2026-05-18T00:00:00.000Z",
      mode: "real-product-composition",
      productCandidates: liveProducts,
      productSearchMeta,
    },
  );

  const selectedProducts = job.concepts.flatMap((concept) => concept.products);
  assert.equal(job.productSearchMeta?.status, "live");
  assert.ok(selectedProducts.length > 0);
  assert.ok(selectedProducts.every((product) => product.source === "네이버쇼핑"));
  assert.ok(selectedProducts.every((product) => product.fetchedAt === "2026-05-18T00:00:00.000Z"));
});
