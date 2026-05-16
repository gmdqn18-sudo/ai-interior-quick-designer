import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildAfterImagePrompt, imageDataUrlToBlobParts, normalizeRenderAfterRequest } from "./after-image";
import type { DesignConcept } from "./interior-design";

const concept: DesignConcept = {
  id: "concept_test",
  title: "화이트 미니멀 수납 시안",
  strategy: "책상은 유지하고 무타공 수납과 웜 조명으로 정돈된 방을 만든다.",
  usedBudget: 150000,
  budgetFitScore: 94,
  feasibilityScore: 93,
  roomStructureScore: 95,
  highlights: ["책상 유지", "수납 중심", "못질 없이"],
  palette: "bg-amber-100",
  products: [
    {
      id: "desk-organizer",
      name: "우드 데스크 정리함 세트",
      category: "수납",
      price: 21900,
      source: "네이버쇼핑",
      url: "https://shopping.naver.com/",
      reason: "책상을 정리한다.",
    },
    {
      id: "lamp",
      name: "웜톤 무드 조명",
      category: "조명",
      price: 18900,
      source: "쿠팡",
      url: "https://www.coupang.com/",
      reason: "분위기를 만든다.",
    },
  ],
};

test("buildAfterImagePrompt preserves room structure and includes selected concept details", () => {
  const prompt = buildAfterImagePrompt({
    concept,
    userPrompt: "침실인데 섹시하고 따뜻한 호텔식 분위기",
    keptFurniture: ["책상", "침대"],
  });

  assert.match(prompt, /preserve the original room layout/i);
  assert.match(prompt, /Korean small room/i);
  assert.match(prompt, /화이트 미니멀 수납 시안/);
  assert.match(prompt, /책상, 침대/);
  assert.match(prompt, /우드 데스크 정리함 세트/);
});

test("imageDataUrlToBlobParts parses base64 data URLs", () => {
  const parsed = imageDataUrlToBlobParts("data:image/png;base64,aGVsbG8=");

  assert.equal(parsed.mimeType, "image/png");
  assert.equal(Buffer.from(parsed.bytes).toString("utf8"), "hello");
});

test("normalizeRenderAfterRequest rejects missing image and keeps valid concept", () => {
  const missingImage = normalizeRenderAfterRequest({ concept });
  assert.equal(missingImage.ok, false);

  const valid = normalizeRenderAfterRequest({
    imageDataUrl: "data:image/jpeg;base64,aGVsbG8=",
    concept,
    userPrompt: "화이트 미니멀",
    keptFurniture: ["책상"],
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.input.image.mimeType, "image/jpeg");
    assert.equal(valid.input.concept.id, concept.id);
  }
});
