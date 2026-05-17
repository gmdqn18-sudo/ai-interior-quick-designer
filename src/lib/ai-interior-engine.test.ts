import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { RoomAnalysis } from "./design-api";
import { buildInteriorDesignPlan } from "./ai-interior-engine";

const baseAnalysis: RoomAnalysis = {
  id: "analysis_test",
  createdAt: "2026-05-16T00:00:00.000Z",
  source: "mock-vision",
  file: { name: "room.jpg", type: "image/jpeg", size: 1_500_000 },
  summary: "원룸, 낮은 채광, 생활감 높음",
  roomType: "원룸",
  lightLevel: "낮음",
  clutterLevel: "높음",
  dominantTones: ["화이트", "라이트 우드", "베이지"],
  detectedFurniture: ["침대", "책상", "옷장"],
  constraints: ["월세방에서도 가능한 무타공/저시공 솔루션 우선"],
  opportunities: ["책상 주변과 바닥 생활감을 수납 박스·카트로 먼저 정리"],
  recommendedPromptAdditions: ["수납 중심", "웜톤 조명 보강", "못질 없이 설치"],
  confidenceScore: 88,
};

test("buildInteriorDesignPlan merges user intent, kept furniture, and room analysis into a prompt brief", () => {
  const plan = buildInteriorDesignPlan({
    budget: 300000,
    prompt: "우드톤 자취방",
    generation: 2,
    keptFurniture: ["책상"],
    roomAnalysis: baseAnalysis,
  });

  assert.equal(plan.promptBrief.roomType, "원룸");
  assert.match(plan.promptBrief.normalizedPrompt, /우드톤 자취방/);
  assert.match(plan.promptBrief.normalizedPrompt, /수납 중심/);
  assert.match(plan.promptBrief.normalizedPrompt, /기존 책상 유지/);
  assert.deepEqual(plan.promptBrief.priorityTags.slice(0, 3), ["storage", "lighting", "renter-safe"]);
});

test("buildInteriorDesignPlan prioritizes storage and lighting products while staying under budget", () => {
  const plan = buildInteriorDesignPlan({
    budget: 150000,
    prompt: "화이트 미니멀",
    generation: 1,
    keptFurniture: ["책상"],
    roomAnalysis: baseAnalysis,
  });

  const allProducts = plan.concepts.flatMap((concept) => concept.products);

  assert.ok(plan.concepts.length >= 3);
  assert.ok(plan.concepts.every((concept) => concept.usedBudget <= 150000));
  assert.ok(allProducts.some((product) => product.category === "수납"));
  assert.ok(allProducts.some((product) => product.category === "조명"));
  assert.ok(plan.concepts[0].highlights.some((highlight) => highlight.includes("방 분석")));
});

test("buildInteriorDesignPlan scales recommendations toward a premium budget while staying under budget", () => {
  const plan = buildInteriorDesignPlan({
    budget: 1_000_000,
    prompt: "호텔식 우드톤 수납 조명까지 제대로 꾸미기",
    generation: 1,
    keptFurniture: ["책상"],
    roomAnalysis: baseAnalysis,
  });

  const highestUsedBudget = Math.max(...plan.concepts.map((concept) => concept.usedBudget));

  assert.ok(highestUsedBudget >= 600_000, `expected at least 600,000원 used, got ${highestUsedBudget}`);
  assert.ok(plan.concepts.every((concept) => concept.usedBudget <= 1_000_000));
  assert.ok(plan.concepts.some((concept) => concept.products.length >= 8));
  assert.ok(plan.concepts.every((concept) => concept.products.length <= 12));
});

test("buildInteriorDesignPlan separates space type from style instead of hardcoding commercial as cafe", () => {
  const cases = [
    {
      prompt: "카페를 창업하려고 하는데, 블랙과 스틸 중심의 모던한 느낌으로 꾸며주세요.",
      spaceType: "cafe",
      styleTag: "dark-modern",
      titlePattern: /카페 .*블랙·모던.*균형 시안/,
      forbidden: /트렌디 카페/,
    },
    {
      prompt: "오피스 리디자인을 하고 싶어요. 쿨톤 화이트와 실버로 미니멀하게 정리해주세요.",
      spaceType: "office",
      styleTag: "minimal",
      titlePattern: /오피스 .*쿨톤·미니멀.*균형 시안/,
      forbidden: /카페/,
    },
    {
      prompt: "쇼룸 매장 인테리어를 우드톤으로 따뜻하고 고급스럽게 바꾸고 싶습니다.",
      spaceType: "showroom",
      styleTag: "warm-tone",
      titlePattern: /쇼룸 .*따뜻한 우드톤.*균형 시안/,
      forbidden: /카페/,
    },
  ] as const;

  for (const item of cases) {
    const plan = buildInteriorDesignPlan({
      budget: 9_970_000,
      prompt: item.prompt,
      generation: 1,
      keptFurniture: [],
      roomAnalysis: null,
    });
    const visibleCopy = plan.concepts.map((concept) => `${concept.title} ${concept.strategy} ${concept.highlights.join(" ")}`).join(" ");
    const highestUsedBudget = Math.max(...plan.concepts.map((concept) => concept.usedBudget));
    const lineItems = plan.concepts.flatMap((concept) => concept.products);

    assert.equal(plan.promptBrief.spaceType, item.spaceType);
    assert.ok(plan.promptBrief.priorityTags.includes("commercial"), `${item.spaceType} should retain commercial as a space-character tag`);
    assert.ok(plan.promptBrief.styleTags.includes(item.styleTag));
    assert.match(plan.concepts[0].title, item.titlePattern);
    assert.doesNotMatch(visibleCopy, item.forbidden);
    assert.ok(highestUsedBudget >= 7_000_000, `expected at least 7,000,000원 used for ${item.spaceType}, got ${highestUsedBudget}`);
    assert.ok(plan.concepts.every((concept) => concept.usedBudget <= 9_970_000));
    assert.ok(lineItems.some((product) => product.quantity && product.quantity > 1), `${item.spaceType} large budgets should use quantity-aware line items`);
    assert.ok(lineItems.every((product) => product.linkType === "product-detail"));
  }
});

test("buildInteriorDesignPlan changes product mix for a cozy Ghibli living-room prompt", () => {
  const ghibliPlan = buildInteriorDesignPlan({
    budget: 1_000_000,
    prompt: "여기는 거실인데, 지브리 컨셉의 포근한 느낌으로 꾸미고 싶어요.",
    generation: 1,
    keptFurniture: [],
    roomAnalysis: baseAnalysis,
  });
  const minimalPlan = buildInteriorDesignPlan({
    budget: 1_000_000,
    prompt: "화이트 미니멀하게 수납 중심으로 정리하고 싶어요.",
    generation: 1,
    keptFurniture: [],
    roomAnalysis: baseAnalysis,
  });

  const ghibliProducts = ghibliPlan.concepts[0].products.map((product) => product.name);
  const minimalProducts = minimalPlan.concepts[0].products.map((product) => product.name);
  const ghibliTopSix = ghibliProducts.slice(0, 6).join(" ");
  const overlap = ghibliProducts.filter((name) => minimalProducts.includes(name)).length;

  assert.match(ghibliTopSix, /내추럴|호두나무|참나무|숲속의 동화|쿠션|커피테이블/);
  assert.ok(!ghibliTopSix.includes("데스크"), `Ghibli living-room top products should not be desk-heavy: ${ghibliTopSix}`);
  assert.ok(ghibliPlan.concepts.every((concept) => concept.products.every((product) => product.category !== "침구")), "living-room Ghibli plans should avoid bedroom bedding items");
  assert.ok(
    ghibliPlan.concepts.every((concept) => !`${concept.title} ${concept.strategy} ${concept.highlights.join(" ")}`.includes("침구")),
    "living-room Ghibli visible copy should avoid bedroom bedding language",
  );
  assert.ok(
    ghibliPlan.concepts.every((concept) => concept.products.filter((product) => product.category === "러그").length <= 1),
    "living-room Ghibli plans should not pad the budget with duplicate rugs",
  );
  assert.ok(overlap <= 7, `expected prompt-specific product mix, got ${overlap} overlapping products`);
});

test("buildInteriorDesignPlan changes Step 2 options when room analysis changes", () => {
  const brightLivingAnalysis: RoomAnalysis = {
    ...baseAnalysis,
    id: "analysis_bright_living",
    roomType: "거실",
    lightLevel: "좋음",
    clutterLevel: "낮음",
    dominantTones: ["쿨 화이트", "블랙", "실버"],
    detectedFurniture: ["소파", "커튼", "조명"],
    opportunities: ["기존 정돈감을 유지하면서 러그와 식물로 포인트 추가"],
    recommendedPromptAdditions: ["쿨 화이트 블랙 톤 유지", "미니멀 포인트", "자연광을 살리는 배치"],
  };
  const clutteredWorkAnalysis: RoomAnalysis = {
    ...baseAnalysis,
    id: "analysis_cluttered_work",
    roomType: "작업방",
    lightLevel: "낮음",
    clutterLevel: "높음",
    dominantTones: ["아이보리", "월넛", "웜 그레이"],
    detectedFurniture: ["책상", "수납장", "러그"],
    opportunities: ["책상 주변과 바닥 생활감을 수납 박스·카트로 먼저 정리"],
    recommendedPromptAdditions: ["아이보리 월넛 톤 유지", "수납 중심", "웜톤 조명 보강", "못질 없이 설치"],
  };

  const brightPlan = buildInteriorDesignPlan({
    budget: 500000,
    prompt: "방을 깔끔하게 꾸미고 싶어요",
    generation: 1,
    keptFurniture: [],
    roomAnalysis: brightLivingAnalysis,
  });
  const clutteredPlan = buildInteriorDesignPlan({
    budget: 500000,
    prompt: "방을 깔끔하게 꾸미고 싶어요",
    generation: 2,
    keptFurniture: [],
    roomAnalysis: clutteredWorkAnalysis,
  });

  const brightTopProducts = brightPlan.concepts.map((concept) => concept.products.slice(0, 3).map((product) => product.id).join("/")).join("|");
  const clutteredTopProducts = clutteredPlan.concepts.map((concept) => concept.products.slice(0, 3).map((product) => product.id).join("/")).join("|");

  assert.notEqual(brightTopProducts, clutteredTopProducts);
  assert.match(clutteredPlan.promptBrief.normalizedPrompt, /수납 중심/);
  assert.match(clutteredPlan.promptBrief.normalizedPrompt, /웜톤 조명 보강/);
  assert.ok(clutteredPlan.concepts[0].highlights.some((highlight) => highlight.includes("방 분석")));
});

test("buildInteriorDesignPlan changes visible style copy for dark modern prompts instead of forcing warm wood tone", () => {
  const plan = buildInteriorDesignPlan({
    budget: 300000,
    prompt: "블랙 그레이 톤의 모던한 작업방. 책상은 그대로 두고 케이블 수납 정리",
    generation: 1,
    keptFurniture: ["책상"],
    roomAnalysis: null,
  });
  const visibleCopy = plan.concepts.map((concept) => `${concept.title} ${concept.strategy} ${concept.highlights.join(" ")}`).join(" ");

  assert.ok(plan.promptBrief.priorityTags.includes("dark-modern"));
  assert.match(visibleCopy, /블랙·모던/);
  assert.doesNotMatch(visibleCopy, /따뜻한 우드톤/);
  assert.ok(plan.concepts[0].palette.includes("zinc") || plan.concepts[0].palette.includes("slate"));
});

test("buildInteriorDesignPlan exposes metrics for API responses and recent history", () => {
  const plan = buildInteriorDesignPlan({
    budget: 300000,
    prompt: "호텔식 침실",
    generation: 3,
    keptFurniture: [],
    roomAnalysis: null,
  });

  assert.equal(plan.metrics.conceptCount, plan.concepts.length);
  assert.equal(plan.metrics.historyCount, plan.history.length);
  assert.ok(plan.metrics.averageBudgetFitScore > 0);
  assert.ok(plan.promptBrief.priorityTags.length > 0);
});
