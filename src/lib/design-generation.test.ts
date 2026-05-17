import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DesignGenerationRequest, RoomAnalysis } from "./design-api";
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
