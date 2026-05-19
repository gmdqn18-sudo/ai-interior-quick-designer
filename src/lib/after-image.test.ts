import * as assert from "node:assert/strict";
import { test } from "node:test";

import { buildAfterImagePrompt, buildMultiProductCompositePrompt, buildProductCompositePrompt, imageDataUrlToBlobParts, normalizeRenderAfterRequest } from "./after-image";
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
      externalId: "test-storage-1",
      name: "우드 데스크 정리함 세트",
      category: "수납",
      price: 21900,
      source: "이케아",
      url: "https://www.ikea.com/kr/ko/p/test-storage-1/",
      linkType: "product-detail",
      verifiedAt: "2026-05-17",
      reason: "책상을 정리한다.",
    },
    {
      id: "lamp",
      externalId: "test-lamp-1",
      name: "웜톤 무드 조명",
      category: "조명",
      price: 18900,
      source: "이케아",
      url: "https://www.ikea.com/kr/ko/p/test-lamp-1/",
      linkType: "product-detail",
      verifiedAt: "2026-05-17",
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

  assert.match(prompt, /exact same camera position/i);
  assert.match(prompt, /Do not rotate, zoom in, zoom out, reframe/i);
  assert.match(prompt, /same photo after interior changes/i);
  assert.match(prompt, /Korean bedroom residential context/i);
  assert.doesNotMatch(prompt, /Korean small room \/ bedroom \/ studio apartment context/i);
  assert.match(prompt, /same-photo product\/lighting retouch/i);
  assert.match(prompt, /Preserve the original wall and floor materials, window shape, existing furniture silhouettes/i);
  assert.match(prompt, /Keep the output close to the input photo, not a polished catalog remake/i);
  assert.match(prompt, /화이트 미니멀 수납 시안/);
  assert.match(prompt, /책상, 침대/);
  assert.match(prompt, /우드 데스크 정리함 세트/);
});

test("buildAfterImagePrompt changes image context for cafe office and showroom prompts", () => {
  const cases = [
    {
      title: "카페 블랙·모던 균형 시안",
      userPrompt: "카페 창업 공간을 블랙과 스틸 중심의 모던한 분위기로",
      expected: /Korean cafe commercial context/i,
      forbidden: /bedroom|studio apartment/i,
    },
    {
      title: "오피스 쿨톤·미니멀 수납·정리 시안",
      userPrompt: "오피스 리디자인을 쿨톤 미니멀하게",
      expected: /Korean office workspace context/i,
      forbidden: /cafe|bedroom/i,
    },
    {
      title: "쇼룸 따뜻한 우드톤 분위기 전환 시안",
      userPrompt: "쇼룸 매장 인테리어를 우드톤으로",
      expected: /Korean showroom retail context/i,
      forbidden: /cafe|bedroom/i,
    },
  ];

  for (const item of cases) {
    const prompt = buildAfterImagePrompt({
      concept: { ...concept, title: item.title },
      userPrompt: item.userPrompt,
      keptFurniture: [],
    });

    assert.match(prompt, item.expected);
    assert.doesNotMatch(prompt, item.forbidden);
  }
});

test("buildAfterImagePrompt does not inject a warm-minimal default when user prompt is empty", () => {
  const prompt = buildAfterImagePrompt({
    concept: { ...concept, title: "블랙·모던 균형 시안", strategy: "차콜과 실버 중심으로 정돈한다.", highlights: ["블랙·모던 기준"] },
    userPrompt: "",
    keptFurniture: [],
  });

  assert.doesNotMatch(prompt, /budget-friendly warm minimal room/i);
  assert.doesNotMatch(prompt, /따뜻한 우드톤/);
  assert.match(prompt, /do not invent an extra default style/);
  assert.match(prompt, /블랙·모던 균형 시안/);
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
    productReference: {
      id: "naver-product-1",
      name: "실제 상품 러그",
      category: "러그",
      imageUrl: "https://example.com/rug.jpg",
      source: "네이버쇼핑",
      url: "https://example.com/product",
    },
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.input.image.mimeType, "image/jpeg");
    assert.equal(valid.input.concept.id, concept.id);
    assert.equal(valid.input.productReference?.id, "naver-product-1");
    assert.equal(valid.input.productReference?.imageUrl, "https://example.com/rug.jpg");
    assert.deepEqual(valid.input.productReferences?.map((product) => product.id), ["naver-product-1"]);
  }
});

test("buildProductCompositePrompt locks the selected product identity for C-option harmonization", () => {
  const prompt = buildProductCompositePrompt({
    concept,
    userPrompt: "책상은 유지하고 러그만 먼저 확인",
    keptFurniture: ["책상"],
    productReference: {
      id: "naver-product-1",
      name: "실제 상품 러그",
      category: "러그",
      imageUrl: "https://example.com/rug.jpg",
      source: "네이버쇼핑",
      url: "https://example.com/product",
    },
    placementLabel: "바닥 중앙",
  });

  assert.match(prompt, /CRITICAL MULTI-PRODUCT LOCK/);
  assert.match(prompt, /실제 상품 러그/);
  assert.match(prompt, /Do not alter any product identity, silhouette, color, pattern, proportions/i);
  assert.match(prompt, /Only harmonize lighting, contact shadows, color temperature/i);
  assert.doesNotMatch(prompt, /Recommended items to reflect visually/i);
});

test("buildMultiProductCompositePrompt locks up to three selected product identities together", () => {
  const prompt = buildMultiProductCompositePrompt({
    concept,
    userPrompt: "러그와 조명, 수납을 같이 확인",
    keptFurniture: ["책상"],
    productReferences: [
      { id: "rug", name: "실제 러그", category: "러그", imageUrl: "https://example.com/rug.jpg", source: "네이버쇼핑", url: "https://example.com/rug" },
      { id: "lamp", name: "실제 조명", category: "조명", imageUrl: "https://example.com/lamp.jpg", source: "네이버쇼핑", url: "https://example.com/lamp" },
      { id: "storage", name: "실제 수납장", category: "수납", imageUrl: "https://example.com/storage.jpg", source: "네이버쇼핑", url: "https://example.com/storage" },
    ],
    placementLabels: ["바닥 중앙", "우측 코너", "우측 하단"],
  });

  assert.match(prompt, /CRITICAL MULTI-PRODUCT LOCK/);
  assert.match(prompt, /실제 러그/);
  assert.match(prompt, /실제 조명/);
  assert.match(prompt, /실제 수납장/);
  assert.match(prompt, /Do not replace any product with a similar item/i);
  assert.match(prompt, /same-photo harmonization pass/i);
  assert.match(prompt, /nearly pixel-identical to the input composite/i);
  assert.match(prompt, /do not add beds, desks, blinds, lamps, cabinets, rugs, props, or decor/i);
  assert.match(prompt, /Do not redraw the room, do not change the room layout/i);
  assert.match(prompt, /Preserve existing furniture silhouettes and positions/i);
  assert.doesNotMatch(prompt, /Recommended items to reflect visually/i);
});
