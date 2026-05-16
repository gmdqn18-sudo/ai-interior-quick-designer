export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  source: "쿠팡" | "이케아" | "오늘의집" | "네이버쇼핑";
  url: string;
  reason: string;
};

export type DesignConcept = {
  id: string;
  title: string;
  strategy: string;
  usedBudget: number;
  budgetFitScore: number;
  feasibilityScore: number;
  roomStructureScore: number;
  highlights: string[];
  palette: string;
  products: Product[];
};

export function getProductPurchaseUrl(product: Product) {
  const query = encodeURIComponent(product.name);

  switch (product.source) {
    case "쿠팡":
      return `https://www.coupang.com/np/search?q=${query}`;
    case "오늘의집":
      return `https://ohou.se/productions/feed?query=${query}`;
    case "이케아":
      return `https://www.ikea.com/kr/ko/search/?q=${query}`;
    case "네이버쇼핑":
      return `https://search.shopping.naver.com/search/all?query=${query}`;
    default:
      return product.url;
  }
}

export function getProductCompareUrl(product: Product) {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(product.name)}`;
}

export function getProductPlacement(product: Product) {
  switch (product.category) {
    case "조명":
      return "침대 옆/책상 주변의 어두운 영역";
    case "러그":
      return "침대 앞 또는 의자 이동 동선";
    case "커튼":
      return "창가 전체 톤 정리";
    case "수납":
      return "책상 옆·침대 밑·노출 수납 구역";
    case "침구":
      return "침대 위 큰 면적";
    case "가구":
      return "침대 옆 또는 빈 코너";
    case "소품":
      return "빈 벽/코너의 마감 포인트";
    case "패브릭":
      return "침대·의자·소파 위 톤 보정";
    default:
      return "선택한 시안의 분위기 포인트";
  }
}

export const budgetPresets = [100000, 200000, 300000, 500000, 1000000];
export const keepOptions = ["침대", "책상", "옷장", "소파", "커튼", "조명"];
export const styleChips = ["우드톤", "화이트 미니멀", "감성 자취방", "수납 중심", "호텔식", "못질 없이"];

export const productPool: Product[] = [
  {
    id: "lamp-warm",
    name: "웜톤 무드 테이블 램프",
    category: "조명",
    price: 18900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "적은 비용으로 방 분위기를 크게 바꿀 수 있어요.",
  },
  {
    id: "rug-beige",
    name: "베이지 워셔블 러그 150x200",
    category: "러그",
    price: 42000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "바닥 면적을 정리해 방을 따뜻하고 넓어 보이게 해요.",
  },
  {
    id: "curtain-blackout",
    name: "베이지 암막 커튼 세트",
    category: "커튼",
    price: 39000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/",
    reason: "창가 톤을 정리해 전체 색감을 통일해요.",
  },
  {
    id: "storage-cart",
    name: "화이트 이동식 3단 수납장",
    category: "수납",
    price: 49900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "못질 없이 수납량을 늘릴 수 있어 월세방에 적합해요.",
  },
  {
    id: "side-table-oak",
    name: "라이트 오크 침대 협탁",
    category: "가구",
    price: 29900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "침대 옆 빈 공간을 정리하고 우드톤 포인트를 줘요.",
  },
  {
    id: "bedding-white",
    name: "화이트 호텔식 침구 세트",
    category: "침구",
    price: 89000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "큰 면적의 침구를 바꾸면 방 전체 인상이 깔끔해져요.",
  },
  {
    id: "shelf-nailfree",
    name: "무타공 슬림 벽선반",
    category: "수납",
    price: 27900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "못질 없이 벽면 수납과 장식 포인트를 만들 수 있어요.",
  },
  {
    id: "plant",
    name: "중형 인테리어 조화 화분",
    category: "소품",
    price: 24900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "관리 부담 없이 방에 생기를 더해요.",
  },
  {
    id: "desk-organizer",
    name: "우드 데스크 정리함 세트",
    category: "수납",
    price: 21900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "기존 책상을 유지하면서 깔끔한 작업 공간을 만들어요.",
  },
  {
    id: "rug-small",
    name: "소형 베이지 포인트 러그",
    category: "러그",
    price: 24900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "예산을 줄이면서도 바닥 톤을 정리할 수 있는 대체안이에요.",
  },
  {
    id: "lamp-clip",
    name: "집게형 무드 조명",
    category: "조명",
    price: 12900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "책상이나 선반에 바로 고정할 수 있는 저가 조명 대체안이에요.",
  },
  {
    id: "fabric-box",
    name: "패브릭 수납 박스 3개 세트",
    category: "수납",
    price: 15900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/",
    reason: "수납 가구를 새로 들이지 않고도 생활감을 숨길 수 있어요.",
  },
  {
    id: "led-strip-warm",
    name: "간접 LED 웜 라인 조명",
    category: "조명",
    price: 22900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "낮은 채광의 방도 벽 손상 없이 따뜻한 간접 조명으로 보완해요.",
  },
  {
    id: "floor-lamp-slim",
    name: "슬림 장스탠드 무드 조명",
    category: "조명",
    price: 54900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "원룸 구석의 어두운 영역을 호텔식 분위기로 바꿔요.",
  },
  {
    id: "nailfree-hook-rail",
    name: "무타공 후크 레일 세트",
    category: "수납",
    price: 13900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "월세방에서도 못질 없이 가방과 소품을 벽면에 정리할 수 있어요.",
  },
  {
    id: "underbed-storage",
    name: "침대 밑 리빙 수납함 2P",
    category: "수납",
    price: 32900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "좁은 원룸에서 죽은 공간을 활용해 계절 옷과 잡동사니를 숨겨요.",
  },
  {
    id: "ivory-sheer-curtain",
    name: "아이보리 쉬폰 커튼",
    category: "커튼",
    price: 29900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "자연광은 살리고 창가 톤을 부드럽게 통일해요.",
  },
  {
    id: "wood-blind",
    name: "라이트 우드 블라인드",
    category: "커튼",
    price: 69900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/",
    reason: "창가에 우드톤을 더해 전체 팔레트를 고급스럽게 잡아줘요.",
  },
  {
    id: "mini-sideboard-white",
    name: "화이트 미니 사이드보드",
    category: "수납",
    price: 79900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "노출 수납을 줄이고 작은 방도 깔끔하게 보이게 해요.",
  },
  {
    id: "pegboard-desk",
    name: "무타공 데스크 페그보드",
    category: "수납",
    price: 35900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "기존 책상을 유지하면서 작업 도구를 세로로 정리해요.",
  },
  {
    id: "cable-box-white",
    name: "화이트 케이블 정리 박스",
    category: "수납",
    price: 9900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "책상과 TV 주변의 생활감을 가장 저렴하게 숨길 수 있어요.",
  },
  {
    id: "cotton-throw",
    name: "베이지 코튼 소파 스로우",
    category: "패브릭",
    price: 26900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "기존 소파나 침대를 바꾸지 않고 패브릭 톤을 통일해요.",
  },
  {
    id: "hotel-pillow-set",
    name: "호텔식 베개 커버 2P",
    category: "침구",
    price: 19900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "침구 전체 교체 전에도 사진발 좋은 화이트 레이어를 만들어요.",
  },
  {
    id: "large-plant",
    name: "대형 몬스테라 조화 화분",
    category: "소품",
    price: 45900,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "빈 코너에 생기를 더해 완성도 높은 After 이미지를 만들어요.",
  },
  {
    id: "poster-frame-oak",
    name: "오크 포스터 액자 세트",
    category: "소품",
    price: 21900,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "우드톤 포인트를 작은 비용으로 추가하고 빈 벽을 정리해요.",
  },
  {
    id: "washable-runner",
    name: "워셔블 침대 옆 러너 러그",
    category: "러그",
    price: 31900,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "침대 주변 동선을 따뜻하게 만들고 관리 부담을 낮춰요.",
  },
  {
    id: "ergonomic-chair-cream",
    name: "크림 패브릭 인테리어 작업 의자",
    category: "가구",
    price: 169000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "예산이 충분할 때 기존 책상은 유지하면서 방 분위기와 착석감을 동시에 올려요.",
  },
  {
    id: "low-bed-frame-oak",
    name: "라이트 오크 저상형 침대 프레임",
    category: "가구",
    price: 229000,
    source: "네이버쇼핑",
    url: "https://shopping.naver.com/",
    reason: "프리미엄 예산에서 침대 주변의 큰 면적과 우드톤 통일감을 가장 크게 바꿔요.",
  },
  {
    id: "modular-wardrobe-white",
    name: "화이트 모듈형 오픈 옷장 수납장",
    category: "수납",
    price: 159000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/",
    reason: "옷과 잡동사니 노출을 줄여 원룸 전체를 깔끔하게 정리해요.",
  },
  {
    id: "premium-bedding-set",
    name: "프리미엄 호텔식 침구 풀세트",
    category: "침구",
    price: 149000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "예산이 넉넉할 때 침대 위 큰 면적을 한 번에 고급스럽게 바꿔요.",
  },
  {
    id: "large-wool-look-rug",
    name: "대형 울라이크 베이지 러그 200x300",
    category: "러그",
    price: 129000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "바닥 면적을 크게 덮어 방 전체의 색감과 체감 완성도를 높여요.",
  },
  {
    id: "smart-ceiling-light",
    name: "스마트 LED 천장 조명 리모컨형",
    category: "조명",
    price: 89000,
    source: "쿠팡",
    url: "https://www.coupang.com/",
    reason: "주조명을 바꿔 낮은 채광과 야간 분위기를 모두 개선해요.",
  },
  {
    id: "oak-full-length-mirror",
    name: "오크 프레임 전신거울 수납형",
    category: "소품",
    price: 99000,
    source: "오늘의집",
    url: "https://ohou.se/",
    reason: "좁은 방을 넓어 보이게 만들고 우드톤 포인트를 크게 더해요.",
  },
];

export function getSubstitute(product: Product) {
  return productPool.find(
    (candidate) => candidate.category === product.category && candidate.price < product.price && candidate.id !== product.id,
  );
}

export function buildConcepts(budget: number, prompt: string, generation: number): DesignConcept[] {
  const concepts: Array<Omit<DesignConcept, "usedBudget"> & { productIds: string[] }> = [
    {
      id: `mood-${generation}`,
      title: "무드 조명·러그 중심 시안",
      strategy: "가구를 크게 바꾸지 않고 조명, 러그, 커튼으로 분위기를 빠르게 전환합니다.",
      budgetFitScore: 96,
      feasibilityScore: 91,
      roomStructureScore: 94,
      palette: "bg-gradient-to-br from-amber-100 via-stone-100 to-orange-200",
      highlights: ["월세방도 부담 없는 변화", "따뜻한 우드톤 강조", "가성비 높은 체감 변화"],
      productIds: ["lamp-warm", "rug-beige", "curtain-blackout", "side-table-oak", "plant"],
      products: [],
    },
    {
      id: `storage-${generation}`,
      title: "수납·정리 중심 시안",
      strategy: "책상과 침대는 유지하고 이동식 수납과 무타공 선반으로 생활감을 줄입니다.",
      budgetFitScore: 93,
      feasibilityScore: 95,
      roomStructureScore: 90,
      palette: "bg-gradient-to-br from-sky-100 via-white to-slate-200",
      highlights: ["기존 가구 유지", "수납 부족 해결", "못질 없이 설치 가능"],
      productIds: ["storage-cart", "shelf-nailfree", "desk-organizer", "lamp-warm", "curtain-blackout"],
      products: [],
    },
    {
      id: `bedding-${generation}`,
      title: "침구·협탁 중심 호텔식 시안",
      strategy: "침대 주변의 큰 면적을 정리해 적은 품목으로 호텔식 인상을 만듭니다.",
      budgetFitScore: 89,
      feasibilityScore: 88,
      roomStructureScore: 92,
      palette: "bg-gradient-to-br from-zinc-100 via-white to-stone-300",
      highlights: ["사진발 좋은 Before/After", "침실 무드 강화", "깔끔한 화이트톤"],
      productIds: ["bedding-white", "side-table-oak", "lamp-warm", "rug-beige", "plant"],
      products: [],
    },
  ];

  return concepts.map((concept, index) => {
    const products: Product[] = [];
    let total = 0;
    const budgetCap = Math.max(10000, Math.floor(budget * 0.96));
    const targetSpend = budget >= 700000 ? Math.floor(budget * 0.72) : budget >= 300000 ? Math.floor(budget * 0.65) : 0;
    const maxProducts = budget >= 700000 ? 12 : budget >= 300000 ? 8 : 5;

    for (const id of concept.productIds) {
      const product = productPool.find((item) => item.id === id);
      if (!product) continue;
      if (total + product.price <= budgetCap) {
        products.push(product);
        total += product.price;
      }
    }

    if (targetSpend > 0 && total < targetSpend) {
      const preferredCategories = new Set(products.map((product) => product.category));
      const fillers = productPool
        .filter((product) => !products.some((item) => item.id === product.id))
        .sort((a, b) => {
          const categoryScore = Number(preferredCategories.has(b.category)) - Number(preferredCategories.has(a.category));
          if (categoryScore !== 0) return categoryScore;
          return b.price - a.price;
        });

      for (const product of fillers) {
        if (products.length >= maxProducts) break;
        if (total + product.price > budgetCap) continue;
        products.push(product);
        total += product.price;
        if (products.length >= maxProducts) break;
      }
    }

    const promptBonus = prompt.includes("수납") && concept.id.startsWith("storage") ? 3 : 0;
    const scoreShift = (generation + index) % 4;

    return {
      ...concept,
      id: `${concept.id}-${index}`,
      products,
      usedBudget: total,
      budgetFitScore: Math.min(99, concept.budgetFitScore + promptBonus - scoreShift),
      feasibilityScore: Math.min(99, concept.feasibilityScore + promptBonus),
      roomStructureScore: concept.roomStructureScore,
    };
  });
}

export function buildConceptHistory(budget: number, prompt: string, generation: number) {
  return Array.from({ length: generation }, (_, index) => buildConcepts(budget, prompt, generation - index)).flat().slice(0, 9);
}
