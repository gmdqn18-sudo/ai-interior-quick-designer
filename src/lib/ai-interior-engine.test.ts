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
  assert.ok(overlap <= 7, `expected prompt-specific product mix, got ${overlap} overlapping products`);
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
