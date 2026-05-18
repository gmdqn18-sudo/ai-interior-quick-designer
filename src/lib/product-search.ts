import { buildPromptBrief, type InteriorPromptBrief, type InteriorPriorityTag, type InteriorSpaceType, type InteriorStyleTag } from "./ai-interior-engine";
import type { DesignGenerationRequest } from "./design-api";
import { productPool, type Product } from "./interior-design";
import { searchNaverShopping, type NaverShoppingClientOptions } from "./naver-shopping";

export type ProductSearchProvider = "naver-shopping" | "static-catalog" | "mixed";
export type ProductSearchStatus = "live" | "partial-fallback" | "fallback";

export type ProductSearchQuery = {
  query: string;
  targetCategory: string;
  spaceType: InteriorSpaceType;
  spaceLabel: string;
  styleTags: InteriorStyleTag[];
  styleLabel: string;
  intentTags: InteriorPriorityTag[];
};

export type ProductSearchMeta = {
  provider: ProductSearchProvider;
  status: ProductSearchStatus;
  queries: ProductSearchQuery[];
  fetchedAt: string;
  apiCallCount: number;
  fallbackReason?: string;
  notice: string;
};

export type ProductSearchResult = {
  products: Product[];
  meta: ProductSearchMeta;
};

export type ResolveProductCandidatesOptions = NaverShoppingClientOptions & {
  minLiveProducts?: number;
  maxQueries?: number;
};

const PRICE_NOTICE = "가격/재고는 외부 쇼핑몰 사정에 따라 변동될 수 있습니다.";

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getSpaceLabel(spaceType: InteriorSpaceType) {
  if (spaceType === "cafe") return "카페";
  if (spaceType === "office") return "오피스";
  if (spaceType === "showroom") return "쇼룸";
  if (spaceType === "store") return "매장";
  if (spaceType === "studio") return "스튜디오";
  return "주거";
}

function getStyleLabel(styleTags: InteriorStyleTag[]) {
  if (styleTags.includes("dark-modern")) return "블랙 모던";
  if (styleTags.includes("cool-tone") && styleTags.includes("minimal")) return "쿨톤 미니멀";
  if (styleTags.includes("cozy-natural")) return "내추럴 포근한";
  if (styleTags.includes("warm-tone")) return "우드 베이지";
  if (styleTags.includes("hotel")) return "호텔식";
  if (styleTags.includes("minimal")) return "화이트 미니멀";
  if (styleTags.includes("cool-tone")) return "그레이 쿨톤";
  return "인테리어";
}

function categoriesForBrief(brief: InteriorPromptBrief) {
  const categories: string[] = [];

  if (brief.spaceType === "cafe") categories.push("조명", "가구", "수납", "소품", "러그");
  else if (brief.spaceType === "office") categories.push("가구", "수납", "조명", "소품", "러그");
  else if (brief.spaceType === "showroom" || brief.spaceType === "store") categories.push("수납", "조명", "가구", "소품", "러그");
  else if (brief.spaceType === "studio") categories.push("조명", "수납", "가구", "소품", "러그");
  else categories.push("조명", "러그", "수납", "커튼", "침구", "패브릭");

  if (brief.priorityTags.includes("living-room")) categories.push("거실가구", "패브릭", "소품");
  if (brief.priorityTags.includes("plant")) categories.push("소품");
  if (brief.priorityTags.includes("hotel") && brief.spaceType === "residential") categories.push("침구");
  if (brief.priorityTags.includes("storage")) categories.push("수납");
  if (brief.priorityTags.includes("lighting")) categories.push("조명");

  return unique(categories).slice(0, 6);
}

function keywordForCategory(category: string, brief: InteriorPromptBrief) {
  if (brief.spaceType === "cafe") {
    if (category === "가구") return "테이블 의자 세트";
    if (category === "수납") return "카운터 수납 선반";
    if (category === "조명") return "펜던트 조명";
    if (category === "소품") return "메뉴보드 사인 소품";
  }
  if (brief.spaceType === "office") {
    if (category === "가구") return "데스크 의자";
    if (category === "수납") return "오피스 수납 선반";
    if (category === "조명") return "사무실 조명";
    if (category === "소품") return "화이트보드 정리 소품";
  }
  if (brief.spaceType === "showroom" || brief.spaceType === "store") {
    if (category === "수납") return "진열 선반";
    if (category === "조명") return "매장 조명";
    if (category === "가구") return "디스플레이 테이블";
    if (category === "소품") return "사인 장식 소품";
  }

  const defaults: Record<string, string> = {
    조명: "무드등 조명",
    러그: "러그",
    수납: "수납 선반",
    커튼: "커튼 블라인드",
    침구: "침구 세트",
    패브릭: "쿠션 패브릭",
    거실가구: "커피테이블 사이드테이블",
    가구: "의자 테이블",
    소품: "인테리어 소품",
  };
  return defaults[category] ?? category;
}

export function buildProductSearchQueries(input: DesignGenerationRequest, brief: InteriorPromptBrief = buildPromptBrief(input)): ProductSearchQuery[] {
  const spaceLabel = getSpaceLabel(brief.spaceType);
  const styleLabel = getStyleLabel(brief.styleTags);
  const maxQueries = Math.max(4, Math.min(6, Number(process.env.PRODUCT_SEARCH_MAX_QUERIES) || 5));
  return categoriesForBrief(brief)
    .slice(0, maxQueries)
    .map((category) => ({
      query: `${spaceLabel} ${keywordForCategory(category, brief)} ${styleLabel}`.replace(/\s+/g, " ").trim(),
      targetCategory: category,
      spaceType: brief.spaceType,
      spaceLabel,
      styleTags: brief.styleTags,
      styleLabel,
      intentTags: brief.priorityTags,
    }));
}

function dedupeProducts(products: Product[]) {
  const seen = new Set<string>();
  const deduped: Product[] = [];

  for (const product of products) {
    const key = product.externalId || `${product.name}-${product.mallName ?? product.source}-${product.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(product);
  }

  return deduped;
}

function fallbackProducts(reason: string, queries: ProductSearchQuery[]): ProductSearchResult {
  return {
    products: productPool,
    meta: {
      provider: "static-catalog",
      status: "fallback",
      queries,
      fetchedAt: new Date().toISOString(),
      apiCallCount: 0,
      fallbackReason: reason,
      notice: `실시간 검색 실패로 기본 카탈로그 추천을 사용했습니다. ${PRICE_NOTICE}`,
    },
  };
}

export async function resolveProductCandidatesForDesign(
  input: DesignGenerationRequest,
  brief: InteriorPromptBrief = buildPromptBrief(input),
  options: ResolveProductCandidatesOptions = {},
): Promise<ProductSearchResult> {
  const queries = buildProductSearchQueries(input, brief).slice(0, options.maxQueries ?? (Number(process.env.PRODUCT_SEARCH_MAX_QUERIES) || 5));
  const hasCredentials = Boolean(options.clientId ?? process.env.NAVER_SHOPPING_CLIENT_ID) && Boolean(options.clientSecret ?? process.env.NAVER_SHOPPING_CLIENT_SECRET);

  if (!hasCredentials) {
    return fallbackProducts("네이버 쇼핑 API 키가 없어 기본 카탈로그로 대체했습니다.", queries);
  }

  const products: Product[] = [];
  let apiCallCount = 0;

  try {
    for (const query of queries) {
      apiCallCount += 1;
      products.push(...(await searchNaverShopping(query, options)));
    }
  } catch (error) {
    return {
      ...fallbackProducts(error instanceof Error ? error.message : "네이버 쇼핑 API 호출 실패", queries),
      meta: {
        ...fallbackProducts("", queries).meta,
        apiCallCount,
        fallbackReason: error instanceof Error ? error.message : "네이버 쇼핑 API 호출 실패",
      },
    };
  }

  const liveProducts = dedupeProducts(products);
  const minLiveProducts = options.minLiveProducts ?? 12;

  if (liveProducts.length === 0) {
    return fallbackProducts("네이버 쇼핑 검색 결과에서 유효한 상품 후보를 찾지 못했습니다.", queries);
  }

  if (liveProducts.length < minLiveProducts) {
    return {
      products: dedupeProducts([...liveProducts, ...productPool]),
      meta: {
        provider: "mixed",
        status: "partial-fallback",
        queries,
        fetchedAt: new Date().toISOString(),
        apiCallCount,
        fallbackReason: `실시간 상품 후보가 ${liveProducts.length}개라 기본 카탈로그로 일부 보완했습니다.`,
        notice: `실시간 상품 후보가 부족해 기본 카탈로그를 일부 함께 사용했습니다. ${PRICE_NOTICE}`,
      },
    };
  }

  return {
    products: liveProducts,
    meta: {
      provider: "naver-shopping",
      status: "live",
      queries,
      fetchedAt: new Date().toISOString(),
      apiCallCount,
      notice: `네이버 쇼핑 실시간 검색 결과를 기반으로 생성 시점의 상품 후보를 저장했습니다. ${PRICE_NOTICE}`,
    },
  };
}
