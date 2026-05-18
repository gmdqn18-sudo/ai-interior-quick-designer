import type { DesignGenerationRequest, RoomAnalysis } from "./design-api";
import { productPool, type DesignConcept, type Product } from "./interior-design";

export type InteriorPriorityTag =
  | "storage"
  | "lighting"
  | "renter-safe"
  | "warm-tone"
  | "minimal"
  | "hotel"
  | "workstation"
  | "plant"
  | "fabric"
  | "living-room"
  | "cozy-natural"
  | "cool-tone"
  | "dark-modern"
  | "commercial";

export type InteriorSpaceType = "cafe" | "office" | "showroom" | "store" | "studio" | "residential";
export type InteriorStyleTag = Extract<InteriorPriorityTag, "dark-modern" | "warm-tone" | "minimal" | "cozy-natural" | "cool-tone" | "hotel">;

export type InteriorPromptBrief = {
  normalizedPrompt: string;
  priorityTags: InteriorPriorityTag[];
  styleTags: InteriorStyleTag[];
  spaceType: InteriorSpaceType;
  roomType: RoomAnalysis["roomType"] | "미분석";
  budgetTier: "starter" | "standard" | "premium";
  keepNotes: string[];
  analysisSummary: string | null;
};

export type BuildInteriorDesignPlanOptions = {
  productCandidates?: Product[];
};

export type InteriorDesignPlan = {
  promptBrief: InteriorPromptBrief;
  concepts: DesignConcept[];
  history: DesignConcept[];
  metrics: {
    conceptCount: number;
    historyCount: number;
    averageBudgetFitScore: number;
    cheapestConceptUsedBudget: number;
    highestConceptUsedBudget: number;
  };
};

type ConceptTemplate = {
  slug: string;
  title: string;
  strategy: string;
  palette: string;
  categories: string[];
  tags: InteriorPriorityTag[];
  highlights: string[];
  baseScores: Pick<DesignConcept, "budgetFitScore" | "feasibilityScore" | "roomStructureScore">;
};

const conceptTemplates: ConceptTemplate[] = [
  {
    slug: "analysis-fit",
    title: "방 분석 맞춤 균형 시안",
    strategy: "사진에서 추정한 채광·생활감·기존 가구를 먼저 반영하고, 예산 안에서 체감 변화가 큰 품목부터 조합합니다.",
    palette: "bg-gradient-to-br from-slate-100 via-white to-stone-200",
    categories: ["수납", "조명", "러그", "커튼", "소품", "패브릭"],
    tags: ["storage", "lighting", "renter-safe"],
    highlights: ["방 분석 결과 반영", "예산 대비 체감 변화 우선", "무타공·저시공 중심"],
    baseScores: { budgetFitScore: 95, feasibilityScore: 94, roomStructureScore: 93 },
  },
  {
    slug: "storage-reset",
    title: "수납·생활감 리셋 시안",
    strategy: "바닥과 책상 주변의 생활감을 먼저 숨기고, 이동식 수납과 패브릭 박스로 월세방 부담을 낮춥니다.",
    palette: "bg-gradient-to-br from-sky-100 via-white to-slate-200",
    categories: ["수납", "조명", "소품", "러그"],
    tags: ["storage", "workstation", "renter-safe"],
    highlights: ["수납 부족 해결", "기존 가구 유지", "정리 후 넓어 보이는 동선"],
    baseScores: { budgetFitScore: 94, feasibilityScore: 96, roomStructureScore: 91 },
  },
  {
    slug: "mood-layer",
    title: "조명·패브릭 무드업 시안",
    strategy: "큰 가구 교체 없이 조명, 러그, 커튼, 침구처럼 사진발이 좋은 면적 요소를 바꿉니다.",
    palette: "bg-gradient-to-br from-zinc-100 via-white to-stone-300",
    categories: ["조명", "러그", "커튼", "침구", "소품", "패브릭"],
    tags: ["lighting", "fabric", "hotel"],
    highlights: ["Before/After 차이 극대화", "따뜻한 조도 보강", "사진 공유에 강한 구성"],
    baseScores: { budgetFitScore: 91, feasibilityScore: 90, roomStructureScore: 94 },
  },
];

function uniqueTags<T extends string>(tags: T[]): T[] {
  return Array.from(new Set(tags));
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferBudgetTier(budget: number): InteriorPromptBrief["budgetTier"] {
  if (budget < 200000) return "starter";
  if (budget < 700000) return "standard";
  return "premium";
}

function inferSpaceType(promptIndex: string, analysis: RoomAnalysis | null): InteriorSpaceType {
  if (hasAny(promptIndex, ["카페", "커피숍", "커피 바", "창업"])) return "cafe";
  if (hasAny(promptIndex, ["오피스", "사무실", "회의실", "업무공간", "워크스페이스"])) return "office";
  if (hasAny(promptIndex, ["쇼룸", "전시장", "전시 공간"])) return "showroom";
  if (hasAny(promptIndex, ["매장", "상점", "샵", "리테일", "편집샵", "업장"])) return "store";
  if (hasAny(promptIndex, ["스튜디오", "촬영", "작업실"])) return "studio";
  if (analysis?.roomType === "작업방") return "studio";
  return "residential";
}

function inferStyleTags(promptIndex: string): InteriorStyleTag[] {
  const tags: InteriorStyleTag[] = [];
  if (hasAny(promptIndex, ["블랙", "검정", "다크", "시크", "모던", "남성", "차콜", "무채색", "스틸"])) tags.push("dark-modern");
  if (hasAny(promptIndex, ["우드", "베이지", "아이보리", "따뜻", "웜", "원목"])) tags.push("warm-tone");
  if (hasAny(promptIndex, ["미니멀", "화이트", "깔끔"])) tags.push("minimal");
  if (hasAny(promptIndex, ["쿨", "블루", "실버", "그레이", "회색", "차가운", "차분한", "화이트"])) tags.push("cool-tone");
  if (hasAny(promptIndex, ["지브리", "포근", "아늑", "동화", "내추럴", "라탄", "숲", "컨셉"])) tags.push("cozy-natural");
  if (hasAny(promptIndex, ["호텔", "호텔식"])) tags.push("hotel");
  return uniqueTags(tags);
}

export function buildPromptBrief(input: DesignGenerationRequest): InteriorPromptBrief {
  const analysis = input.roomAnalysis ?? null;
  const promptParts = [
    input.prompt.trim(),
    ...input.keptFurniture.map((item) => `기존 ${item} 유지`),
    ...(analysis?.recommendedPromptAdditions ?? []),
    ...(analysis?.constraints ?? []),
  ].filter(Boolean);
  const normalizedPrompt = promptParts.join(" · ");
  const promptIndex = normalizedPrompt.replace(/\s+/g, " ");
  const tags: InteriorPriorityTag[] = [];
  const spaceType = inferSpaceType(promptIndex, analysis);
  const styleTags = inferStyleTags(promptIndex);

  if (analysis?.clutterLevel !== "낮음" || hasAny(promptIndex, ["수납", "정리", "생활감"])) tags.push("storage");
  if (analysis?.lightLevel !== "좋음" || hasAny(promptIndex, ["조명", "무드", "웜톤"])) tags.push("lighting");
  if (hasAny(promptIndex, ["무타공", "못질 없이", "월세", "저시공"])) tags.push("renter-safe");
  if (hasAny(promptIndex, ["우드", "베이지", "아이보리", "따뜻", "웜"])) tags.push("warm-tone");
  if (hasAny(promptIndex, ["미니멀", "화이트", "깔끔"])) tags.push("minimal");
  if (hasAny(promptIndex, ["쿨", "블루", "실버", "그레이", "회색", "차가운", "차분한", "화이트"])) tags.push("cool-tone");
  if (hasAny(promptIndex, ["블랙", "검정", "다크", "시크", "모던", "남성", "차콜", "무채색"])) tags.push("dark-modern");
  if (hasAny(promptIndex, ["호텔", "침구", "호텔식"])) tags.push("hotel");
  if (input.keptFurniture.includes("책상") || hasAny(promptIndex, ["작업", "책상", "데스크"])) tags.push("workstation");
  if (hasAny(promptIndex, ["식물", "화분", "플랜트", "초록", "숲"])) tags.push("plant");
  if (hasAny(promptIndex, ["패브릭", "러그", "커튼", "침구", "쿠션", "소파"])) tags.push("fabric");
  if (hasAny(promptIndex, ["거실", "소파", "티테이블", "커피테이블", "라운지"])) tags.push("living-room");
  if (hasAny(promptIndex, ["카페", "창업", "매장", "상업", "쇼룸", "스튜디오", "오피스", "업장"])) tags.push("commercial");
  if (hasAny(promptIndex, ["지브리", "포근", "아늑", "동화", "내추럴", "라탄", "원목", "숲", "컨셉"])) tags.push("cozy-natural");

  if (spaceType !== "residential") tags.push("commercial");

  return {
    normalizedPrompt: promptIndex || "예산 안에서 빠르게 체감되는 인테리어 시안",
    priorityTags: uniqueTags(tags.length > 0 ? tags : ["renter-safe", "fabric"]),
    styleTags,
    spaceType,
    roomType: analysis?.roomType ?? "미분석",
    budgetTier: inferBudgetTier(input.budget),
    keepNotes: input.keptFurniture.map((item) => `${item} 유지`),
    analysisSummary: analysis?.summary ?? null,
  };
}

function productTags(product: Product): InteriorPriorityTag[] {
  const text = `${product.name} ${product.category} ${product.reason}`;
  const tags: InteriorPriorityTag[] = [];

  if (product.category === "수납" || hasAny(text, ["수납", "정리", "박스", "카트", "북쉘프"])) tags.push("storage");
  if (product.category === "조명" || hasAny(text, ["조명", "램프", "무드", "웜톤", "한지"])) tags.push("lighting");
  if (hasAny(text, ["무타공", "못질 없이", "이동식", "집게형"])) tags.push("renter-safe");
  if (hasAny(text, ["우드", "오크", "베이지", "웜", "아이보리", "원목", "라탄", "내추럴"])) tags.push("warm-tone");
  if (hasAny(text, ["화이트", "미니멀", "슬림", "깔끔"])) tags.push("minimal");
  if (hasAny(text, ["화이트", "실버", "그레이", "회색", "오프화이트", "애쉬"])) tags.push("cool-tone");
  if (hasAny(text, ["블랙", "검정", "차콜", "모던", "철제", "니켈"])) tags.push("dark-modern");
  if (hasAny(text, ["호텔", "침구"])) tags.push("hotel");
  if (hasAny(text, ["책상", "데스크", "모니터"])) tags.push("workstation");
  if (hasAny(text, ["화분", "식물", "조화", "숲", "자연"])) tags.push("plant");
  if (["러그", "커튼", "침구", "패브릭"].includes(product.category) || hasAny(text, ["쿠션", "린넨", "코튼"])) tags.push("fabric");
  if (product.category === "거실가구" || hasAny(text, ["거실", "티테이블", "커피테이블", "소파", "좌식", "라운드"])) tags.push("living-room");
  if (hasAny(text, ["지브리", "포근", "아늑", "동화", "내추럴", "라탄", "원목", "숲", "한지", "코튼"])) tags.push("cozy-natural");

  return uniqueTags(tags);
}

function scoreProduct(product: Product, template: ConceptTemplate, brief: InteriorPromptBrief, index: number) {
  const tags = productTags(product);
  const tagMatches = tags.filter((tag) => brief.priorityTags.includes(tag)).length;
  const templateMatches = tags.filter((tag) => template.tags.includes(tag)).length;
  const categoryMatch = template.categories.includes(product.category) ? 2 : 0;
  const budgetPenalty = brief.budgetTier === "starter" && product.price > 50000 ? 2 : 0;
  const premiumBudgetBoost = brief.budgetTier === "premium" ? Math.min(8, product.price / 30000) : 0;
  const standardBudgetBoost = brief.budgetTier === "standard" ? Math.min(3, product.price / 60000) : 0;
  const promptMismatchPenalty =
    (tags.includes("living-room") && !brief.priorityTags.includes("living-room") ? 4 : 0) +
    (tags.includes("cozy-natural") && !brief.priorityTags.includes("cozy-natural") ? 4 : 0) +
    (tags.includes("workstation") && !brief.priorityTags.includes("workstation") ? 2 : 0);
  const productText = `${product.name} ${product.reason}`;
  const cozySpecificBoost =
    brief.priorityTags.includes("cozy-natural") && hasAny(productText, ["숲", "동화", "내추럴", "참나무", "대나무", "호두", "식물"])
      ? 14
      : 0;
  const livingRoomSpecificBoost =
    brief.priorityTags.includes("living-room") && hasAny(productText, ["거실", "커피테이블", "보조테이블", "쿠션", "그림"])
      ? 8
      : 0;
  return (
    tagMatches * 5 +
    templateMatches * 3 +
    categoryMatch +
    premiumBudgetBoost +
    standardBudgetBoost +
    cozySpecificBoost +
    livingRoomSpecificBoost -
    budgetPenalty -
    promptMismatchPenalty -
    index * 0.03
  );
}

function canAddProduct(product: Product, picked: Product[], brief: InteriorPromptBrief) {
  if (product.category === "침구" && brief.priorityTags.includes("living-room") && !brief.priorityTags.includes("hotel")) return false;

  const sameCategoryCount = picked.filter((item) => item.category === product.category).length;
  const isLivingRoomPlan = brief.priorityTags.includes("living-room");
  const maxByCategory = isLivingRoomPlan
    ? product.category === "러그" || product.category === "침구"
      ? 1
      : product.category === "조명" || product.category === "소품"
        ? 3
        : 2
    : 99;
  return sameCategoryCount < maxByCategory;
}

function makeQuantityLineItem(product: Product, quantity: number): Product {
  if (quantity <= 1) return product;
  return {
    ...product,
    id: `${product.id}-qty-${quantity}`,
    name: `${product.name} × ${quantity}`,
    unitPrice: product.unitPrice ?? product.price,
    quantity,
    price: product.price * quantity,
    reason: `${product.reason} ${quantity}개 기준으로 좌석/존을 확장해 예산 규모에 맞춥니다.`,
  };
}

function canScaleQuantity(product: Product, brief: InteriorPromptBrief) {
  if (product.quantity && product.quantity > 1) return false;
  if (brief.priorityTags.includes("commercial")) {
    return ["조명", "러그", "수납", "거실가구", "가구", "소품", "패브릭", "커튼"].includes(product.category);
  }
  return ["조명", "수납", "소품", "패브릭"].includes(product.category);
}

function expandQuantitiesForBudget(picked: Product[], brief: InteriorPromptBrief, budgetCap: number, targetSpend: number) {
  if (targetSpend <= 0) return picked;

  let total = picked.reduce((sum, product) => sum + product.price, 0);
  if (total >= targetSpend) return picked;

  const expanded = [...picked];
  const maxQuantity = brief.priorityTags.includes("commercial") ? 24 : brief.budgetTier === "premium" ? 8 : 4;
  const scalableIndexes = expanded
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => canScaleQuantity(product, brief))
    .sort((a, b) => b.product.price - a.product.price);

  for (const { product, index } of scalableIndexes) {
    if (total >= targetSpend) break;
    const unitPrice = product.unitPrice ?? product.price;
    const affordableExtra = Math.floor((budgetCap - total) / unitPrice);
    if (affordableExtra <= 0) continue;
    const neededExtra = Math.ceil((targetSpend - total) / unitPrice);
    const extraQuantity = Math.max(0, Math.min(maxQuantity - 1, affordableExtra, neededExtra));
    if (extraQuantity <= 0) continue;
    const nextQuantity = 1 + extraQuantity;
    expanded[index] = makeQuantityLineItem(product, nextQuantity);
    total += unitPrice * extraQuantity;
  }

  return expanded;
}

function selectProducts(template: ConceptTemplate, brief: InteriorPromptBrief, budget: number, productCandidates: Product[]) {
  const budgetCap = Math.max(10000, Math.floor(budget * 0.96));
  const isLargeCommercialPlan = brief.priorityTags.includes("commercial") && budget >= 2_000_000;
  const targetSpend = isLargeCommercialPlan
    ? Math.floor(budget * 0.72)
    : brief.budgetTier === "premium"
      ? Math.floor(budget * 0.72)
      : brief.budgetTier === "standard"
        ? Math.floor(budget * 0.65)
        : 0;
  const maxProducts = isLargeCommercialPlan ? 18 : brief.budgetTier === "premium" ? 12 : brief.budgetTier === "standard" ? 8 : 5;
  const sorted = productCandidates
    .map((product, index) => ({ product, score: scoreProduct(product, template, brief, index) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (brief.budgetTier === "starter" ? a.product.price - b.product.price : b.product.price - a.product.price));

  const picked: Product[] = [];
  let total = 0;

  for (const { product } of sorted) {
    if (brief.budgetTier === "starter" && picked.some((item) => item.category === product.category) && picked.length >= 3) continue;
    if (!canAddProduct(product, picked, brief)) continue;
    if (total + product.price > budgetCap) continue;
    picked.push(product);
    total += product.price;
    if (picked.length >= maxProducts) break;
  }

  if (targetSpend > 0 && total < targetSpend) {
    const fillers = productCandidates
      .filter((product) => !picked.some((item) => item.id === product.id))
      .sort((a, b) => {
        const templateCategoryScore = Number(template.categories.includes(b.category)) - Number(template.categories.includes(a.category));
        if (templateCategoryScore !== 0) return templateCategoryScore;
        return b.price - a.price;
      });

    for (const product of fillers) {
      if (picked.length >= maxProducts) break;
      if (!canAddProduct(product, picked, brief)) continue;
      if (total + product.price > budgetCap) continue;
      picked.push(product);
      total += product.price;
      if (picked.length >= maxProducts) break;
    }
  }

  if (picked.length < 3) {
    for (const product of productCandidates.slice().sort((a, b) => a.price - b.price)) {
      if (picked.some((item) => item.id === product.id)) continue;
      if (!canAddProduct(product, picked, brief)) continue;
      if (total + product.price > budgetCap) continue;
      picked.push(product);
      total += product.price;
      if (picked.length >= 3) break;
    }
  }

  return expandQuantitiesForBudget(picked, brief, budgetCap, targetSpend);
}

function getSpaceTypeLabel(spaceType: InteriorSpaceType) {
  if (spaceType === "cafe") return "카페";
  if (spaceType === "office") return "오피스";
  if (spaceType === "showroom") return "쇼룸";
  if (spaceType === "store") return "매장";
  if (spaceType === "studio") return "스튜디오";
  return "";
}

function getStyleLabel(brief: InteriorPromptBrief) {
  if (brief.styleTags.includes("dark-modern")) return "블랙·모던";
  if (brief.styleTags.includes("cool-tone") && brief.styleTags.includes("minimal")) return "쿨톤·미니멀";
  if (brief.styleTags.includes("cozy-natural")) return "포근한 내추럴";
  if (brief.styleTags.includes("warm-tone")) return "따뜻한 우드톤";
  if (brief.styleTags.includes("hotel")) return "호텔식";
  if (brief.styleTags.includes("minimal")) return "화이트 미니멀";
  if (brief.styleTags.includes("cool-tone")) return "쿨톤";
  return brief.spaceType === "residential" ? "입력 조건 맞춤" : "입력 스타일 맞춤";
}

function summarizeUserPrompt(brief: InteriorPromptBrief) {
  const firstPart = brief.normalizedPrompt.split(" · ")[0]?.trim() ?? "";
  if (!firstPart) return "입력한 조건";
  return firstPart.length > 44 ? `${firstPart.slice(0, 44)}…` : firstPart;
}

function getPaletteForBrief(template: ConceptTemplate, brief: InteriorPromptBrief) {
  if (brief.priorityTags.includes("dark-modern")) return "bg-gradient-to-br from-zinc-950 via-slate-800 to-stone-700 text-white";
  if (brief.priorityTags.includes("cool-tone")) return "bg-gradient-to-br from-slate-100 via-white to-blue-100";
  if (brief.priorityTags.includes("cozy-natural") || brief.priorityTags.includes("plant")) return "bg-gradient-to-br from-lime-100 via-stone-100 to-emerald-100";
  if (brief.priorityTags.includes("warm-tone")) return "bg-gradient-to-br from-amber-100 via-stone-100 to-orange-200";
  if (brief.priorityTags.includes("minimal")) return "bg-gradient-to-br from-white via-slate-50 to-zinc-200";
  return template.palette;
}

function getTitlePrefix(brief: InteriorPromptBrief) {
  const spaceLabel = getSpaceTypeLabel(brief.spaceType);
  const styleLabel = getStyleLabel(brief);
  return [spaceLabel, styleLabel].filter(Boolean).join(" ");
}

function getTitleForBrief(template: ConceptTemplate, brief: InteriorPromptBrief) {
  const titlePrefix = getTitlePrefix(brief);
  if (template.slug === "analysis-fit") return `${titlePrefix} 균형 시안`;
  if (template.slug === "storage-reset") return `${titlePrefix} 수납·정리 시안`;
  if (template.slug === "mood-layer") return `${titlePrefix} 분위기 전환 시안`;
  return template.title;
}

function getStrategyForBrief(template: ConceptTemplate, brief: InteriorPromptBrief) {
  const styleLabel = getStyleLabel(brief);
  const promptSummary = summarizeUserPrompt(brief);
  if (template.slug === "storage-reset") {
    return `프롬프트 핵심(${promptSummary})을 기준으로 생활감·수납·선 정리 우선순위를 정합니다.`;
  }
  if (template.slug === "mood-layer") {
    if (brief.priorityTags.includes("living-room")) {
      return `프롬프트 핵심(${promptSummary})을 기준으로 조명·러그·쿠션·소품의 분위기 전환 범위를 정합니다.`;
    }
    return `프롬프트 핵심(${promptSummary})을 기준으로 조명·패브릭·소품의 분위기 전환 범위를 정합니다.`;
  }
  return `프롬프트 핵심(${promptSummary})을 기준으로 ${styleLabel} 방향의 예산 맞춤 구매 조합을 만듭니다.`;
}

function getHighlightsForBrief(template: ConceptTemplate, brief: InteriorPromptBrief) {
  const styleLabel = getStyleLabel(brief);
  const styleHighlight = brief.styleTags.includes("warm-tone") ? "따뜻한 우드톤 반영" : `${styleLabel} 반영`;
  return [
    styleHighlight,
    ...template.highlights.filter((highlight) => !highlight.includes("우드톤") && !highlight.includes("따뜻한")),
    ...(brief.analysisSummary ? [`방 분석: ${brief.roomType} · ${brief.priorityTags.slice(0, 3).join("/")}`] : []),
  ].slice(0, 4);
}

function buildConceptsForInput(input: DesignGenerationRequest, brief: InteriorPromptBrief, productCandidates: Product[]): DesignConcept[] {
  return conceptTemplates.map((template, index) => {
    const products = selectProducts(template, brief, input.budget, productCandidates);
    const usedBudget = products.reduce((sum, product) => sum + product.price, 0);
    const matchedTags = template.tags.filter((tag) => brief.priorityTags.includes(tag)).length;
    const generationShift = (input.generation + index) % 3;

    return {
      id: `${template.slug}-${input.generation}-${index}`,
      title: getTitleForBrief(template, brief),
      strategy: getStrategyForBrief(template, brief),
      usedBudget,
      budgetFitScore: Math.min(99, template.baseScores.budgetFitScore + matchedTags - generationShift),
      feasibilityScore: Math.min(99, template.baseScores.feasibilityScore + (brief.priorityTags.includes("renter-safe") ? 2 : 0)),
      roomStructureScore: Math.min(99, template.baseScores.roomStructureScore + matchedTags),
      highlights: getHighlightsForBrief(template, brief),
      palette: getPaletteForBrief(template, brief),
      products,
    };
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildMetrics(concepts: DesignConcept[], history: DesignConcept[]): InteriorDesignPlan["metrics"] {
  const usedBudgets = concepts.map((concept) => concept.usedBudget);

  return {
    conceptCount: concepts.length,
    historyCount: history.length,
    averageBudgetFitScore: average(concepts.map((concept) => concept.budgetFitScore)),
    cheapestConceptUsedBudget: Math.min(...usedBudgets),
    highestConceptUsedBudget: Math.max(...usedBudgets),
  };
}

export function buildInteriorDesignPlan(input: DesignGenerationRequest, options: BuildInteriorDesignPlanOptions = {}): InteriorDesignPlan {
  const promptBrief = buildPromptBrief(input);
  const productCandidates = options.productCandidates?.length ? options.productCandidates : productPool;
  const concepts = buildConceptsForInput(input, promptBrief, productCandidates);
  const history = Array.from({ length: input.generation }, (_, index) => {
    const generation = input.generation - index;
    return buildConceptsForInput({ ...input, generation }, promptBrief, productCandidates);
  })
    .flat()
    .slice(0, 9);

  return {
    promptBrief,
    concepts,
    history,
    metrics: buildMetrics(concepts, history),
  };
}
