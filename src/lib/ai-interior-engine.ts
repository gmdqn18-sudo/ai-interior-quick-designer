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
  | "cozy-natural";

export type InteriorPromptBrief = {
  normalizedPrompt: string;
  priorityTags: InteriorPriorityTag[];
  roomType: RoomAnalysis["roomType"] | "미분석";
  budgetTier: "starter" | "standard" | "premium";
  keepNotes: string[];
  analysisSummary: string | null;
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
    palette: "bg-gradient-to-br from-amber-100 via-stone-100 to-orange-200",
    categories: ["수납", "조명", "러그", "커튼", "소품", "패브릭"],
    tags: ["storage", "lighting", "renter-safe", "warm-tone"],
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
    tags: ["lighting", "warm-tone", "fabric", "hotel"],
    highlights: ["Before/After 차이 극대화", "따뜻한 조도 보강", "사진 공유에 강한 구성"],
    baseScores: { budgetFitScore: 91, feasibilityScore: 90, roomStructureScore: 94 },
  },
];

function uniqueTags(tags: InteriorPriorityTag[]) {
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

  if (analysis?.clutterLevel !== "낮음" || hasAny(promptIndex, ["수납", "정리", "생활감"])) tags.push("storage");
  if (analysis?.lightLevel !== "좋음" || hasAny(promptIndex, ["조명", "무드", "웜톤"])) tags.push("lighting");
  if (hasAny(promptIndex, ["무타공", "못질 없이", "월세", "저시공"])) tags.push("renter-safe");
  if (hasAny(promptIndex, ["우드", "베이지", "아이보리", "따뜻", "웜"])) tags.push("warm-tone");
  if (hasAny(promptIndex, ["미니멀", "화이트", "깔끔"])) tags.push("minimal");
  if (hasAny(promptIndex, ["호텔", "침구", "호텔식"])) tags.push("hotel");
  if (input.keptFurniture.includes("책상") || hasAny(promptIndex, ["작업", "책상", "데스크"])) tags.push("workstation");
  if (hasAny(promptIndex, ["식물", "화분", "플랜트", "초록", "숲"])) tags.push("plant");
  if (hasAny(promptIndex, ["패브릭", "러그", "커튼", "침구", "쿠션", "소파"])) tags.push("fabric");
  if (hasAny(promptIndex, ["거실", "소파", "티테이블", "커피테이블", "라운지"])) tags.push("living-room");
  if (hasAny(promptIndex, ["지브리", "포근", "아늑", "동화", "내추럴", "라탄", "원목", "숲", "컨셉"])) tags.push("cozy-natural");

  return {
    normalizedPrompt: promptIndex || "예산 안에서 빠르게 체감되는 인테리어 시안",
    priorityTags: uniqueTags(tags.length > 0 ? tags : ["warm-tone", "renter-safe", "fabric"]),
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
  return tagMatches * 5 + templateMatches * 3 + categoryMatch + premiumBudgetBoost + standardBudgetBoost - budgetPenalty - promptMismatchPenalty - index * 0.03;
}

function selectProducts(template: ConceptTemplate, brief: InteriorPromptBrief, budget: number) {
  const budgetCap = Math.max(10000, Math.floor(budget * 0.96));
  const targetSpend = brief.budgetTier === "premium" ? Math.floor(budget * 0.72) : brief.budgetTier === "standard" ? Math.floor(budget * 0.65) : 0;
  const maxProducts = brief.budgetTier === "premium" ? 12 : brief.budgetTier === "standard" ? 8 : 5;
  const sorted = productPool
    .map((product, index) => ({ product, score: scoreProduct(product, template, brief, index) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (brief.budgetTier === "starter" ? a.product.price - b.product.price : b.product.price - a.product.price));

  const picked: Product[] = [];
  let total = 0;

  for (const { product } of sorted) {
    if (brief.budgetTier === "starter" && picked.some((item) => item.category === product.category) && picked.length >= 3) continue;
    if (total + product.price > budgetCap) continue;
    picked.push(product);
    total += product.price;
    if (picked.length >= maxProducts) break;
  }

  if (targetSpend > 0 && total < targetSpend) {
    const fillers = productPool
      .filter((product) => !picked.some((item) => item.id === product.id))
      .sort((a, b) => {
        const templateCategoryScore = Number(template.categories.includes(b.category)) - Number(template.categories.includes(a.category));
        if (templateCategoryScore !== 0) return templateCategoryScore;
        return b.price - a.price;
      });

    for (const product of fillers) {
      if (picked.length >= maxProducts) break;
      if (total + product.price > budgetCap) continue;
      picked.push(product);
      total += product.price;
      if (picked.length >= maxProducts) break;
    }
  }

  if (picked.length < 3) {
    for (const product of productPool.slice().sort((a, b) => a.price - b.price)) {
      if (picked.some((item) => item.id === product.id)) continue;
      if (total + product.price > budgetCap) continue;
      picked.push(product);
      total += product.price;
      if (picked.length >= 3) break;
    }
  }

  return picked;
}

function buildConceptsForInput(input: DesignGenerationRequest, brief: InteriorPromptBrief): DesignConcept[] {
  return conceptTemplates.map((template, index) => {
    const products = selectProducts(template, brief, input.budget);
    const usedBudget = products.reduce((sum, product) => sum + product.price, 0);
    const matchedTags = template.tags.filter((tag) => brief.priorityTags.includes(tag)).length;
    const generationShift = (input.generation + index) % 3;

    return {
      id: `${template.slug}-${input.generation}-${index}`,
      title: template.title,
      strategy: template.strategy,
      usedBudget,
      budgetFitScore: Math.min(99, template.baseScores.budgetFitScore + matchedTags - generationShift),
      feasibilityScore: Math.min(99, template.baseScores.feasibilityScore + (brief.priorityTags.includes("renter-safe") ? 2 : 0)),
      roomStructureScore: Math.min(99, template.baseScores.roomStructureScore + matchedTags),
      highlights: [
        ...template.highlights,
        ...(brief.analysisSummary ? [`방 분석: ${brief.roomType} · ${brief.priorityTags.slice(0, 3).join("/")}`] : []),
      ].slice(0, 4),
      palette: template.palette,
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

export function buildInteriorDesignPlan(input: DesignGenerationRequest): InteriorDesignPlan {
  const promptBrief = buildPromptBrief(input);
  const concepts = buildConceptsForInput(input, promptBrief);
  const history = Array.from({ length: input.generation }, (_, index) => {
    const generation = input.generation - index;
    return buildConceptsForInput({ ...input, generation }, promptBrief);
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
