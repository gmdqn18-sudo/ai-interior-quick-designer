import type { DesignGenerationJob } from "./design-api";
import type { Product } from "./interior-design";

const wonFormatter = new Intl.NumberFormat("ko-KR");

export type DesignShareSummary = {
  heroTitle: string;
  heroStrategy: string;
  usedBudgetLabel: string;
  budgetLabel: string;
  remainingBudgetLabel: string;
  roomAnalysisLabel: string;
  productCategories: string[];
  productCount: number;
  topHighlights: string[];
  executionChecklist: string[];
  budgetUsageRate: number;
};

export function formatWon(amount: number) {
  return `${wonFormatter.format(amount)}원`;
}

export function buildDesignShareUrl(origin: string, jobId: string) {
  return `${origin.replace(/\/$/, "")}/designs/${jobId}`;
}

export function getTopValueProducts(job: DesignGenerationJob, limit = 3): Product[] {
  const products = job.concepts[0]?.products ?? [];

  return [...products]
    .sort((a, b) => {
      const categoryBoost = categoryImpactScore(b.category) - categoryImpactScore(a.category);
      if (categoryBoost !== 0) return categoryBoost;
      return a.price - b.price;
    })
    .slice(0, limit);
}

export function buildShoppingListShareText(job: DesignGenerationJob, shareUrl?: string) {
  const concept = job.concepts[0];
  const productLines = (concept?.products ?? [])
    .map((product, index) => `${index + 1}. ${product.name} - ${formatWon(product.price)} - ${product.source}`)
    .join("\n");
  const lines = [
    `[RoomFit AI] ${concept?.title ?? "인테리어 시안"}`,
    `설정 예산: ${formatWon(job.budget)}`,
    `사용 금액: ${formatWon(concept?.usedBudget ?? 0)}`,
    `남은 예산: ${formatWon(Math.max(0, job.budget - (concept?.usedBudget ?? 0)))}`,
    job.roomAnalysis ? `방 분석: ${job.roomAnalysis.roomType} / 채광 ${job.roomAnalysis.lightLevel} / 생활감 ${job.roomAnalysis.clutterLevel}` : "방 분석: 텍스트 조건 기반",
    shareUrl ? `공유 링크: ${shareUrl}` : null,
    "",
    productLines,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

export function buildDesignShareSummary(job: DesignGenerationJob): DesignShareSummary {
  const heroConcept = job.concepts[0];
  const usedBudget = heroConcept?.usedBudget ?? 0;
  const roomAnalysisLabel = job.roomAnalysis
    ? `${job.roomAnalysis.roomType} · 채광 ${job.roomAnalysis.lightLevel} · 생활감 ${job.roomAnalysis.clutterLevel}`
    : "방 분석 없이 텍스트 조건으로 생성";
  const products = heroConcept?.products ?? [];
  const productCategories = Array.from(new Set(products.map((product) => product.category)));
  const budgetUsageRate = job.budget > 0 ? Math.round((usedBudget / job.budget) * 100) : 0;

  return {
    heroTitle: heroConcept?.title ?? "인테리어 시안",
    heroStrategy: heroConcept?.strategy ?? "예산 안에서 바로 실행 가능한 상품 조합입니다.",
    usedBudgetLabel: formatWon(usedBudget),
    budgetLabel: formatWon(job.budget),
    remainingBudgetLabel: formatWon(Math.max(0, job.budget - usedBudget)),
    roomAnalysisLabel,
    productCategories,
    productCount: products.length,
    topHighlights: heroConcept?.highlights.slice(0, 3) ?? [],
    executionChecklist: products.slice(0, 4).map((product) => `${product.name} 구매 후보 확인`),
    budgetUsageRate,
  };
}

function categoryImpactScore(category: string) {
  if (["조명", "수납", "러그"].includes(category)) return 3;
  if (["커튼", "침구", "식물"].includes(category)) return 2;
  return 1;
}
