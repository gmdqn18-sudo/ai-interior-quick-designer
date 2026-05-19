export type ProductVisualCandidate = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string | null;
};

const MAX_IMAGE_REFLECTED_PRODUCTS = 3;

const HIGH_CONFIDENCE_CATEGORY_PRIORITY = ["러그", "책상/테이블", "커튼", "거실가구", "의자"];
const MEDIUM_CONFIDENCE_CATEGORY_PRIORITY = ["수납", "침구", "패브릭"];
const LOW_CONFIDENCE_CATEGORIES = new Set(["조명", "소품"]);

const LARGE_STORAGE_KEYWORDS = ["선반", "책장", "장식장", "수납장", "캐비닛", "행거", "랙", "트롤리", "서랍장", "거실장"];
const SMALL_STORAGE_KEYWORDS = ["바구니", "박스", "정리함", "소품", "미니", "데스크", "서랍", "꽂이", "홀더", "함"];
const DISTINCTIVE_TEXTILE_KEYWORDS = ["러그", "카페트", "커튼", "암막", "패턴", "체크", "스트라이프", "쿠션", "침구", "이불"];

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getProductVisualConfidence(product: ProductVisualCandidate) {
  if (!product.imageUrl) return 0;

  const text = `${product.category} ${product.name}`.toLowerCase();

  if (HIGH_CONFIDENCE_CATEGORY_PRIORITY.includes(product.category)) return 3;

  if (product.category === "수납") {
    if (hasAnyKeyword(text, LARGE_STORAGE_KEYWORDS)) return 2;
    if (hasAnyKeyword(text, SMALL_STORAGE_KEYWORDS)) return 0;
    return 1;
  }

  if (product.category === "침구" || product.category === "패브릭") {
    return hasAnyKeyword(text, DISTINCTIVE_TEXTILE_KEYWORDS) ? 2 : 1;
  }

  if (LOW_CONFIDENCE_CATEGORIES.has(product.category)) return 0;

  return 1;
}

function categoryPriorityRank(category: string) {
  const highRank = HIGH_CONFIDENCE_CATEGORY_PRIORITY.indexOf(category);
  if (highRank !== -1) return highRank;
  const mediumRank = MEDIUM_CONFIDENCE_CATEGORY_PRIORITY.indexOf(category);
  if (mediumRank !== -1) return HIGH_CONFIDENCE_CATEGORY_PRIORITY.length + mediumRank;
  return HIGH_CONFIDENCE_CATEGORY_PRIORITY.length + MEDIUM_CONFIDENCE_CATEGORY_PRIORITY.length;
}

export function isProductImageReflectable(product: ProductVisualCandidate) {
  return getProductVisualConfidence(product) >= 2;
}

export function selectProductsForImageReflection<T extends ProductVisualCandidate>(products: T[], maxProducts = MAX_IMAGE_REFLECTED_PRODUCTS): T[] {
  const limit = Math.max(1, Math.min(MAX_IMAGE_REFLECTED_PRODUCTS, maxProducts));
  const usedCategories = new Set<string>();

  return products
    .map((product, sourceIndex) => ({ product, sourceIndex, confidence: getProductVisualConfidence(product) }))
    .filter((item) => item.confidence >= 2)
    .sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      const categoryDiff = categoryPriorityRank(a.product.category) - categoryPriorityRank(b.product.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.sourceIndex - b.sourceIndex;
    })
    .filter(({ product }) => {
      if (usedCategories.has(product.category)) return false;
      usedCategories.add(product.category);
      return true;
    })
    .slice(0, limit)
    .map((item) => item.product);
}

export function getImageReflectionSelectionReason() {
  return "러그·테이블·커튼·큰 선반·의자처럼 면적과 실루엣이 큰 상품을 우선하고, 조명·소품·작은 수납처럼 식별이 약한 상품은 이미지 반영 상품에서 제외합니다.";
}
