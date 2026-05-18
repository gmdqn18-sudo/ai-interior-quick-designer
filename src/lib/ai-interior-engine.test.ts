import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { RoomAnalysis } from "./design-api";
import type { Product } from "./interior-design";
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

test("buildInteriorDesignPlan covers explicitly requested categories when live candidates are available", () => {
  const liveProduct = (category: string, name: string, price: number): Product => ({
    id: `live-${category}-${name}`.replace(/\s+/g, "-"),
    externalId: `external-${category}-${name}`,
    name,
    category,
    price,
    source: "네이버쇼핑",
    url: `https://smartstore.naver.com/test/products/${encodeURIComponent(name)}`,
    linkType: "naver-shopping-result",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    reason: `${category} live candidate`,
    provider: "naver-shopping",
    searchQuery: `${category} 검색`,
    availabilityNote: "가격/재고 변동 가능",
    mallName: "테스트몰",
  });
  const productCandidates: Product[] = [
    liveProduct("조명", "화이트 사무실 LED 조명 스탠드", 40000),
    liveProduct("조명", "화이트 사무실 펜던트 조명", 50000),
    liveProduct("조명", "그레이 업무용 무드등", 45000),
    liveProduct("수납", "사무실 수납 캐비닛 정리대", 90000),
    liveProduct("가구", "4인 오피스 데스크 책상", 180000),
    liveProduct("가구", "그레이 사무용 의자 체어", 110000),
  ];

  const plan = buildInteriorDesignPlan(
    {
      budget: 800000,
      prompt: "작은 4인 오피스를 꾸미려고 합니다. 화이트와 그레이 중심의 미니멀한 분위기로 책상, 의자, 수납, 조명을 추천해주세요.",
      generation: 1,
      keptFurniture: [],
      roomAnalysis: null,
    },
    { productCandidates },
  );
  const selectedText = plan.concepts[0].products.map((product) => `${product.category} ${product.name}`).join(" ");

  assert.match(selectedText, /책상|데스크/);
  assert.match(selectedText, /의자|체어/);
  assert.match(selectedText, /수납|캐비닛|정리대/);
  assert.match(selectedText, /조명|스탠드|무드등/);
});

test("buildInteriorDesignPlan keeps requested cafe storage from being filled by chair-like results", () => {
  const liveProduct = (category: string, name: string, price: number, query: string): Product => ({
    id: `cafe-${category}-${name}`.replace(/\s+/g, "-"),
    externalId: `external-cafe-${category}-${name}`,
    name,
    category,
    price,
    source: "네이버쇼핑",
    url: `https://smartstore.naver.com/test/products/${encodeURIComponent(name)}`,
    linkType: "naver-shopping-result",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    reason: `${category} live candidate`,
    provider: "naver-shopping",
    searchQuery: query,
    availabilityNote: "가격/재고 변동 가능",
    mallName: "테스트몰",
  });
  const productCandidates: Product[] = [
    liveProduct("수납", "블랙 바 스툴 2종 세트 메탈 모던 의자", 120000, "카페 카운터 수납 선반 블랙 모던"),
    liveProduct("수납", "블랙 카페 카운터 수납 선반 장식장", 140000, "카페 카운터 수납 선반 블랙 모던"),
    liveProduct("책상/테이블", "블랙 바테이블 카페 테이블", 90000, "카페 바테이블 카페 테이블 블랙 모던"),
    liveProduct("의자", "블랙 바스툴 카페 의자", 70000, "카페 바스툴 카페 의자 블랙 모던"),
    liveProduct("조명", "블랙 펜던트 조명", 60000, "카페 펜던트 조명 블랙 모던"),
  ];

  const plan = buildInteriorDesignPlan(
    {
      budget: 800000,
      prompt: "작은 카페를 창업하려고 합니다. 블랙 모던 분위기로 바 테이블, 조명, 의자, 수납까지 추천해주세요.",
      generation: 1,
      keptFurniture: [],
      roomAnalysis: null,
    },
    { productCandidates },
  );
  const firstConcept = plan.concepts[0].products;
  const storageProducts = firstConcept.filter((product) => product.category === "수납");

  assert.ok(storageProducts.some((product) => /수납|선반|장식장/.test(product.name)), firstConcept.map((product) => product.name).join(" / "));
  assert.ok(storageProducts.every((product) => !/스툴|의자|체어|바스툴/.test(product.name)), firstConcept.map((product) => product.name).join(" / "));
});

test("buildInteriorDesignPlan gives each primary concept the requested residential rug storage lighting and bedding coverage", () => {
  const liveProduct = (category: string, name: string, price: number, query: string): Product => ({
    id: `room-${category}-${name}`.replace(/\s+/g, "-"),
    externalId: `external-room-${category}-${name}`,
    name,
    category,
    price,
    source: "네이버쇼핑",
    url: `https://smartstore.naver.com/test/products/${encodeURIComponent(name)}`,
    linkType: "naver-shopping-result",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    reason: `${category} live candidate`,
    provider: "naver-shopping",
    searchQuery: query,
    availabilityNote: "가격/재고 변동 가능",
    mallName: "테스트몰",
  });
  const productCandidates: Product[] = [
    liveProduct("침구", "원룸 베이지 침구 이불 커버 세트", 70000, "원룸 침구 이불 커버 우드 베이지"),
    liveProduct("조명", "원룸 우드 무드등 조명", 30000, "원룸 무드등 조명 우드 베이지"),
    liveProduct("수납", "원룸 라탄 수납 선반 정리대", 80000, "원룸 수납 선반 우드 베이지"),
    liveProduct("러그", "원룸 베이지 러그 카페트", 60000, "원룸 러그 카페트 우드 베이지"),
    liveProduct("침구", "원룸 추가 차렵이불 베개 세트", 65000, "원룸 침구 이불 커버 우드 베이지"),
    liveProduct("침구", "원룸 침대패드 매트리스 커버", 50000, "원룸 침구 이불 커버 우드 베이지"),
  ];

  const plan = buildInteriorDesignPlan(
    {
      budget: 800000,
      prompt: "월세 원룸을 깔끔하고 따뜻한 우드톤으로 꾸미고 싶습니다. 침구, 조명, 러그, 수납을 예산 안에서 추천해주세요.",
      generation: 1,
      keptFurniture: [],
      roomAnalysis: null,
    },
    { productCandidates },
  );

  for (const concept of plan.concepts) {
    const categories = concept.products.map((product) => product.category);
    assert.ok(categories.includes("침구"), `${concept.title} should include bedding: ${categories.join(",")}`);
    assert.ok(categories.includes("조명"), `${concept.title} should include lighting: ${categories.join(",")}`);
    assert.ok(categories.includes("러그"), `${concept.title} should include rug: ${categories.join(",")}`);
    assert.ok(categories.includes("수납"), `${concept.title} should include storage: ${categories.join(",")}`);
  }
});

test("buildInteriorDesignPlan can use injected live product candidates instead of the static productPool", () => {
  const liveProducts: Product[] = Array.from({ length: 5 }, (_, index) => ({
    id: `naver-live-light-${index + 1}`,
    externalId: `live-${index + 1}`,
    name: `라이브 블랙 카페 조명 ${index + 1}`,
    category: index < 3 ? "조명" : "가구",
    price: 30000 + index * 10000,
    source: "네이버쇼핑",
    url: `https://search.shopping.naver.com/catalog/live-${index + 1}`,
    linkType: "naver-shopping-result",
    fetchedAt: "2026-05-18T00:00:00.000Z",
    reason: "네이버 쇼핑 실시간 검색으로 찾은 카페 상품 후보입니다.",
    provider: "naver-shopping",
    searchQuery: "카페 조명 블랙 모던",
    availabilityNote: "가격/재고 변동 가능",
  }));

  const plan = buildInteriorDesignPlan(
    {
      budget: 300000,
      prompt: "카페를 블랙 모던으로 꾸미고 싶어요",
      generation: 1,
      keptFurniture: [],
      roomAnalysis: null,
    },
    { productCandidates: liveProducts },
  );

  const selectedProducts = plan.concepts.flatMap((concept) => concept.products);
  assert.ok(selectedProducts.length > 0);
  assert.ok(selectedProducts.every((product) => product.source === "네이버쇼핑"));
  assert.ok(selectedProducts.every((product) => product.linkType === "naver-shopping-result"));
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
