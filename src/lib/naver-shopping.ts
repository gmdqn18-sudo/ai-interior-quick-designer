import type { Product } from "./interior-design";
import type { ProductSearchQuery } from "./product-search";

export type NaverShoppingItem = {
  title: string;
  link: string;
  image?: string;
  lprice: string;
  hprice?: string;
  mallName?: string;
  productId?: string;
  productType?: string;
  maker?: string;
  brand?: string;
  category1?: string;
  category2?: string;
  category3?: string;
  category4?: string;
};

export type NaverShoppingResponse = {
  total: number;
  start: number;
  display: number;
  items: NaverShoppingItem[];
};

export type NaverShoppingClientOptions = {
  clientId?: string;
  clientSecret?: string;
  display?: number;
  fetchImpl?: typeof fetch;
};

const NAVER_SHOPPING_ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function makeProductId(item: NaverShoppingItem, query: ProductSearchQuery) {
  if (item.productId) return `naver-${item.productId}`;
  const fallbackKey = `${stripHtml(item.title)}-${item.mallName ?? "naver"}-${item.lprice}-${query.query}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
  return `naver-${fallbackKey}`;
}

export function mapNaverShoppingItemToProduct(item: NaverShoppingItem, query: ProductSearchQuery, fetchedAt: string): Product | null {
  const price = Number(item.lprice);
  if (!Number.isFinite(price) || price <= 0) return null;

  const name = stripHtml(item.title);
  if (!name) return null;

  return {
    id: makeProductId(item, query),
    externalId: item.productId ? String(item.productId) : item.link,
    name,
    category: query.targetCategory,
    price,
    source: "네이버쇼핑",
    url: item.link,
    linkType: "naver-shopping-result",
    fetchedAt,
    reason: `${query.spaceLabel} ${query.targetCategory} 검색 결과에서 ${query.styleLabel} 조건과 예산에 맞춰 고른 실시간 상품 후보입니다. 실제 가격과 재고는 판매처에서 달라질 수 있습니다.`,
    imageUrl: item.image,
    mallName: item.mallName,
    brand: item.brand,
    maker: item.maker,
    rawCategory: {
      category1: item.category1,
      category2: item.category2,
      category3: item.category3,
      category4: item.category4,
    },
    availabilityNote: "가격/재고 변동 가능",
    provider: "naver-shopping",
    searchQuery: query.query,
  };
}

export async function searchNaverShopping(query: ProductSearchQuery, options: NaverShoppingClientOptions = {}) {
  const clientId = options.clientId ?? process.env.NAVER_SHOPPING_CLIENT_ID;
  const clientSecret = options.clientSecret ?? process.env.NAVER_SHOPPING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_SHOPPING_CLIENT_ID/SECRET is not configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const display = Math.max(1, Math.min(100, options.display ?? (Number(process.env.PRODUCT_SEARCH_DISPLAY) || 12)));
  const url = new URL(NAVER_SHOPPING_ENDPOINT);
  url.searchParams.set("query", query.query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "sim");
  url.searchParams.set("exclude", "used:rental:cbshop");

  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver Shopping API failed: ${response.status}`);
  }

  const data = (await response.json()) as NaverShoppingResponse;
  const fetchedAt = new Date().toISOString();

  return (data.items ?? [])
    .map((item) => mapNaverShoppingItemToProduct(item, query, fetchedAt))
    .filter((product): product is Product => Boolean(product));
}
