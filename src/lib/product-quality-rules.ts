import type { Product } from "./interior-design";

export const STRONG_PRODUCT_EXCLUDE_KEYWORDS = ["가디건", "니트", "하객룩", "데일리룩", "오피스룩", "원피스", "셔츠", "팬츠"];

export const SOFT_PRODUCT_PENALTY_KEYWORDS = ["시공", "맞춤", "제작", "촬영", "도매", "대량", "렌탈", "임대", "부품", "부속", "교체용", "캠핑", "차박"];

const RUG_FALSE_POSITIVE_KEYWORDS = ["욕실", "화장실", "발매트", "발판", "발닦이", "미끄럼방지"];
const STORAGE_FALSE_POSITIVE_KEYWORDS = ["침대프레임", "기숙사침대", "이층침대", "침대계단", "침대 계단", "깔판"];
const WEAK_PREMIUM_FILLER_KEYWORDS = ["미니", "작은", "소형", "usb", "USB", "발매트", "발판", "소품"];

export const CATEGORY_POSITIVE_KEYWORDS: Record<string, string[]> = {
  조명: ["조명", "무드등", "펜던트", "스탠드", "램프", "벽등"],
  수납: ["수납", "선반", "서랍", "책장", "정리대", "캐비닛", "장식장"],
  의자: ["의자", "체어", "스툴", "바스툴"],
  "책상/테이블": ["책상", "데스크", "테이블", "카운터", "바테이블", "바 테이블"],
  침구: ["침구", "이불", "베개", "커버", "매트리스", "패드"],
  러그: ["러그", "카페트", "매트"],
  커튼: ["커튼", "블라인드"],
  가구: ["의자", "체어", "스툴", "책상", "데스크", "테이블", "카운터", "바테이블"],
  소품: ["소품", "사인", "메뉴보드", "화이트보드", "장식"],
};

export function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function productQualityText(product: Product) {
  return [
    product.name,
    product.category,
    product.reason,
    product.searchQuery,
    product.rawCategory?.category1,
    product.rawCategory?.category2,
    product.rawCategory?.category3,
    product.rawCategory?.category4,
  ]
    .filter(Boolean)
    .join(" ");
}

export function productIntrinsicText(product: Product) {
  return [product.name, product.rawCategory?.category1, product.rawCategory?.category2, product.rawCategory?.category3, product.rawCategory?.category4].filter(Boolean).join(" ");
}

export function hasCategoryKeywordMismatch(product: Product) {
  const text = productIntrinsicText(product);
  if (product.category === "수납" && hasAnyKeyword(text, CATEGORY_POSITIVE_KEYWORDS.의자)) return true;
  if (["러그", "수납", "패브릭", "소품"].includes(product.category) && hasAnyKeyword(text, RUG_FALSE_POSITIVE_KEYWORDS)) return true;
  if (["수납", "침구", "소품"].includes(product.category) && hasAnyKeyword(text, STORAGE_FALSE_POSITIVE_KEYWORDS)) return true;
  if (product.category === "의자" && hasAnyKeyword(text, CATEGORY_POSITIVE_KEYWORDS.수납) && !hasAnyKeyword(text, CATEGORY_POSITIVE_KEYWORDS.의자)) return true;
  if (product.category === "러그" && !hasAnyKeyword(text, ["러그", "카페트"])) return true;
  return false;
}

export function hasStrongProductExclude(product: Product) {
  return hasAnyKeyword(productQualityText(product), STRONG_PRODUCT_EXCLUDE_KEYWORDS);
}

export function countCategoryKeywordMatches(product: Product) {
  const text = productQualityText(product);
  const keywords = CATEGORY_POSITIVE_KEYWORDS[product.category] ?? [];
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

export function countSoftProductPenalties(product: Product) {
  const text = productQualityText(product);
  return SOFT_PRODUCT_PENALTY_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
}

export function isWeakPremiumBudgetFiller(product: Product) {
  const text = productIntrinsicText(product);
  if (product.price >= 30000) return false;
  if (!["조명", "소품", "러그", "패브릭", "수납"].includes(product.category)) return false;
  return hasAnyKeyword(text, WEAK_PREMIUM_FILLER_KEYWORDS);
}
