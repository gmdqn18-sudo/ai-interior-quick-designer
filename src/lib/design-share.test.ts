import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DesignGenerationJob } from "./design-api";
import {
  buildDesignShareSummary,
  buildDesignShareUrl,
  buildShoppingListShareText,
  getTopValueProducts,
} from "./design-share";

const job: DesignGenerationJob = {
  id: "job_sharetest",
  createdAt: "2026-05-16T00:00:00.000Z",
  status: "completed",
  mode: "mock-product-composition",
  budget: 150000,
  prompt: "화이트 미니멀 수납 중심",
  generation: 2,
  keptFurniture: ["책상"],
  roomAnalysis: {
    id: "analysis_sharetest",
    createdAt: "2026-05-16T00:00:00.000Z",
    source: "mock-vision",
    file: { name: "room.jpg", type: "image/jpeg", size: 1 },
    summary: "원룸 낮은 채광 생활감 높음",
    roomType: "원룸",
    lightLevel: "낮음",
    clutterLevel: "높음",
    dominantTones: ["화이트", "베이지"],
    detectedFurniture: ["책상"],
    constraints: [],
    opportunities: [],
    recommendedPromptAdditions: ["수납 중심", "웜톤 조명 보강"],
    confidenceScore: 88,
  },
  concepts: [
    {
      id: "concept-a",
      title: "방 분석 맞춤 균형 시안",
      strategy: "예산 안에서 체감 변화가 큰 품목을 조합합니다.",
      usedBudget: 137500,
      budgetFitScore: 98,
      feasibilityScore: 96,
      roomStructureScore: 97,
      highlights: ["방 분석 결과 반영", "무타공·저시공 중심"],
      palette: "bg-gradient-to-br from-amber-100 via-stone-100 to-orange-200",
      products: [
        { id: "p1", name: "무타공 데스크 페그보드", category: "수납", price: 35900, source: "쿠팡", url: "https://www.coupang.com/", reason: "기존 책상 유지" },
        { id: "p2", name: "집게형 무드 조명", category: "조명", price: 12900, source: "네이버쇼핑", url: "https://shopping.naver.com/", reason: "채광 보완" },
      ],
    },
  ],
  history: [],
  metrics: {
    conceptCount: 1,
    historyCount: 0,
    averageBudgetFitScore: 98,
    cheapestConceptUsedBudget: 137500,
    highestConceptUsedBudget: 137500,
  },
};

test("buildDesignShareUrl returns a user-facing result page path", () => {
  assert.equal(buildDesignShareUrl("https://example.com", "job_abc"), "https://example.com/designs/job_abc");
});

test("buildDesignShareSummary highlights budget, analysis, and selected product categories", () => {
  const summary = buildDesignShareSummary(job);

  assert.equal(summary.heroTitle, "방 분석 맞춤 균형 시안");
  assert.equal(summary.usedBudgetLabel, "137,500원");
  assert.equal(summary.roomAnalysisLabel, "원룸 · 채광 낮음 · 생활감 높음");
  assert.equal(summary.executionChecklist[0], "무타공 데스크 페그보드 구매 후보 확인");
  assert.deepEqual(summary.productCategories, ["수납", "조명"]);
});

test("buildShoppingListShareText creates copy-ready Korean share text", () => {
  const text = buildShoppingListShareText(job, "https://example.com/designs/job_sharetest");

  assert.match(text, /\[RoomFit AI\] 방 분석 맞춤 균형 시안/);
  assert.match(text, /공유 링크: https:\/\/example.com\/designs\/job_sharetest/);
  assert.match(text, /1\. 무타공 데스크 페그보드 - 35,900원 - 쿠팡/);
  assert.match(text, /구매 링크: https:\/\/www\.coupang\.com\/np\/search\?q=/);
});

test("getTopValueProducts ranks cheaper high-impact products first", () => {
  const products = getTopValueProducts(job, 1);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, "집게형 무드 조명");
});
