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
  mode: "real-product-composition",
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
      title: "입력 조건 맞춤 균형 시안",
      strategy: "예산 안에서 체감 변화가 큰 품목을 조합합니다.",
      usedBudget: 84800,
      budgetFitScore: 98,
      feasibilityScore: 96,
      roomStructureScore: 97,
      highlights: ["입력 조건 기준", "무타공·저시공 중심"],
      palette: "bg-gradient-to-br from-amber-100 via-stone-100 to-orange-200",
      products: [
        {
          id: "ikea-skadis-pegboard",
          externalId: "30320806",
          name: "SKÅDIS 스코디스 페그보드 화이트",
          category: "수납",
          price: 22900,
          source: "이케아",
          url: "https://www.ikea.com/kr/ko/p/skadis-pegboard-white-30320806/",
          linkType: "product-detail",
          verifiedAt: "2026-05-17",
          reason: "기존 책상 유지",
        },
        {
          id: "ikea-fado-table-lamp",
          externalId: "30283899",
          name: "FADO 파도 탁상스탠드 화이트",
          category: "조명",
          price: 24900,
          source: "이케아",
          url: "https://www.ikea.com/kr/ko/p/fado-table-lamp-white-30283899/",
          linkType: "product-detail",
          verifiedAt: "2026-05-17",
          reason: "채광 보완",
        },
      ],
    },
  ],
  history: [],
  metrics: {
    conceptCount: 1,
    historyCount: 0,
    averageBudgetFitScore: 98,
    cheapestConceptUsedBudget: 84800,
    highestConceptUsedBudget: 84800,
  },
};

test("buildDesignShareUrl returns a user-facing result page path", () => {
  assert.equal(buildDesignShareUrl("https://example.com", "job_abc"), "https://example.com/designs/job_abc");
});

test("buildDesignShareSummary highlights budget, input context, and selected product categories", () => {
  const summary = buildDesignShareSummary(job);

  assert.equal(summary.heroTitle, "입력 조건 맞춤 균형 시안");
  assert.equal(summary.usedBudgetLabel, "84,800원");
  assert.equal(summary.roomAnalysisLabel, "사진 업로드 정보 있음 · 프롬프트 기준으로 구성");
  assert.equal(summary.executionChecklist[0], "SKÅDIS 스코디스 페그보드 화이트 구매 후보 확인");
  assert.deepEqual(summary.productCategories, ["수납", "조명"]);
});

test("buildShoppingListShareText creates copy-ready Korean share text with product-detail links", () => {
  const text = buildShoppingListShareText(job, "https://example.com/designs/job_sharetest");

  assert.match(text, /\[RoomFit AI\] 입력 조건 맞춤 균형 시안/);
  assert.match(text, /사진 업로드 정보: 사진을 참고 자료로 등록함 \/ 구매 후보는 프롬프트 기준/);
  assert.match(text, /공유 링크: https:\/\/example.com\/designs\/job_sharetest/);
  assert.match(text, /1\. SKÅDIS 스코디스 페그보드 화이트 - 22,900원 - 이케아/);
  assert.match(text, /구매 링크: https:\/\/www\.ikea\.com\/kr\/ko\/p\/skadis-pegboard-white-30320806\//);
});

test("getTopValueProducts ranks cheaper high-impact products first", () => {
  const products = getTopValueProducts(job, 1);

  assert.equal(products.length, 1);
  assert.equal(products[0].name, "SKÅDIS 스코디스 페그보드 화이트");
});
