export type Product = {
  id: string;
  externalId: string;
  name: string;
  category: string;
  price: number;
  source: "이케아";
  url: string;
  linkType: "product-detail";
  verifiedAt: string;
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
  return product.url;
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
    case "거실가구":
      return "소파 앞·창가·거실 중앙의 포근한 휴식 영역";
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
    id: "ikea-fado-table-lamp",
    externalId: "30283899",
    name: "FADO 파도 탁상스탠드 화이트",
    category: "조명",
    price: 24900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/fado-table-lamp-white-30283899/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "실제 이케아 탁상스탠드로, 적은 비용으로 방의 무드 조명을 보강합니다.",
  },
  {
    id: "ikea-dejsa-table-lamp",
    externalId: "20404991",
    name: "DEJSA 데이사 탁상스탠드 베이지/오팔 화이트 유리",
    category: "조명",
    price: 59900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/dejsa-table-lamp-beige-opal-white-glass-20404991/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "베이지 톤 유리 조명으로 포근한 우드·내추럴 분위기에 맞습니다.",
  },
  {
    id: "ikea-lauters-floor-lamp",
    externalId: "80405054",
    name: "LAUTERS 라우테르스 플로어스탠드 애쉬/화이트",
    category: "조명",
    price: 99900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/lauters-floor-lamp-ash-white-80405054/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "우드 느낌의 플로어 조명으로 거실이나 침실 코너를 부드럽게 밝힙니다.",
  },
  {
    id: "ikea-arstid-table-lamp",
    externalId: "00321379",
    name: "ÅRSTID 오르스티드 탁상스탠드 황동/화이트",
    category: "조명",
    price: 29900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/arstid-table-lamp-brass-white-00321379/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "호텔식 침실이나 협탁 옆에 어울리는 실제 황동 톤 스탠드입니다.",
  },
  {
    id: "ikea-kabbleka-led-strip",
    externalId: "70609706",
    name: "KABBLEKA 카블레카 LED라인조명+USB 밝기조절",
    category: "조명",
    price: 14900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/kabbleka-led-lighting-strip-with-usb-dimmable-70609706/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "책상·선반 뒤에 붙여 무타공 간접조명을 만들 수 있습니다.",
  },
  {
    id: "ikea-isjakt-floor-lamp",
    externalId: "90459715",
    name: "ISJAKT 이샥트 LED상향식플로어스탠드/독서등",
    category: "조명",
    price: 149000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/isjakt-led-floor-uplighter-reading-lamp-dimmable-nickel-plated-90459715/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "예산이 넉넉할 때 거실 전체 조도와 독서등을 동시에 보강합니다.",
  },
  {
    id: "ikea-tiphede-rug",
    externalId: "00456759",
    name: "TIPHEDE 팁헤데 평직러그 내추럴/블랙",
    category: "러그",
    price: 15000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/tiphede-rug-flatwoven-natural-black-00456759/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "저예산으로 바닥 생활감을 줄이는 실제 평직 러그입니다.",
  },
  {
    id: "ikea-lohals-rug",
    externalId: "00307482",
    name: "LOHALS 로할스 평직러그 내추럴",
    category: "러그",
    price: 39900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/lohals-rug-flatwoven-natural-00307482/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "내추럴 질감이라 지브리풍·우드톤·포근한 거실에 잘 맞습니다.",
  },
  {
    id: "ikea-stoense-rug-large",
    externalId: "00426809",
    name: "STOENSE 스토엔세 단모러그 오프화이트",
    category: "러그",
    price: 179000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/stoense-rug-low-pile-off-white-00426809/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "프리미엄 예산에서 큰 바닥 면적을 차분하게 정리합니다.",
  },
  {
    id: "ikea-aerende-rug",
    externalId: "90614976",
    name: "ÄRENDE 에렌데 장모러그 오프화이트",
    category: "러그",
    price: 69900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/aerende-rug-high-pile-off-white-90614976/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "포근한 질감을 빠르게 만드는 실제 장모 러그입니다.",
  },
  {
    id: "ikea-morum-rug-beige",
    externalId: "90624188",
    name: "MORUM 모룸 평직러그 실내외 베이지",
    category: "러그",
    price: 49900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/morum-rug-flatwoven-in-outdoor-beige-90624188/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "베이지 톤으로 거실·침실 모두 무난하게 맞는 실제 러그입니다.",
  },
  {
    id: "ikea-ringblomma-blind-beige",
    externalId: "60583537",
    name: "RINGBLOMMA 링블롬마 로만블라인드 베이지",
    category: "커튼",
    price: 29900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/ringblomma-roman-blind-beige-60583537/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "창가를 베이지 톤으로 정리해 포근한 인상을 만듭니다.",
  },
  {
    id: "ikea-ringblomma-blind-large",
    externalId: "20583539",
    name: "RINGBLOMMA 링블롬마 로만블라인드 베이지 대형",
    category: "커튼",
    price: 39900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/ringblomma-roman-blind-beige-20583539/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "큰 창도 실제 상품 상세 페이지 기준으로 예산에 반영합니다.",
  },
  {
    id: "ikea-nissafors-trolley-white",
    externalId: "70602984",
    name: "NISSAFORS 니사포르스 트롤리 화이트",
    category: "수납",
    price: 21900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/nissafors-trolley-white-70602984/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "월세방에서 이동식으로 생활감 있는 물건을 정리하기 좋습니다.",
  },
  {
    id: "ikea-skadis-pegboard",
    externalId: "30320806",
    name: "SKÅDIS 스코디스 페그보드 화이트",
    category: "수납",
    price: 22900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/skadis-pegboard-white-30320806/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "책상 주변 소품을 세로로 정리하는 실제 이케아 페그보드입니다.",
  },
  {
    id: "ikea-mosslanda-picture-ledge",
    externalId: "70297465",
    name: "MOSSLANDA 모슬란다 액자선반 화이트",
    category: "수납",
    price: 12900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/mosslanda-picture-ledge-white-70297465/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "액자·소품을 올려 벽면을 꾸미는 실제 상품입니다.",
  },
  {
    id: "ikea-billy-bookcase-white",
    externalId: "70522044",
    name: "BILLY 빌리 책장 화이트",
    category: "수납",
    price: 59900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/billy-bookcase-white-70522044/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "책과 장식품을 함께 정리할 수 있는 실제 화이트 책장입니다.",
  },
  {
    id: "ikea-kallax-shelf-white",
    externalId: "20351884",
    name: "KALLAX 칼락스 선반유닛 화이트",
    category: "수납",
    price: 109000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/kallax-shelving-unit-white-20351884/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "프리미엄 예산에서 노출 수납을 크게 개선하는 실제 선반유닛입니다.",
  },
  {
    id: "ikea-jonaxel-shelf-white",
    externalId: "70431317",
    name: "JONAXEL 요낙셀 선반유닛 화이트",
    category: "수납",
    price: 70000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/jonaxel-shelving-unit-white-70431317/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "옷·박스·생활용품을 정리하는 실제 오픈 선반입니다.",
  },
  {
    id: "ikea-holmerud-side-table-oak",
    externalId: "00541423",
    name: "HOLMERUD 홀메루드 보조테이블 참나무무늬",
    category: "거실가구",
    price: 54900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/holmerud-side-table-oak-effect-00541423/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "거실이나 침대 옆에 우드톤 포인트를 만드는 실제 보조테이블입니다.",
  },
  {
    id: "ikea-gladom-tray-table-white",
    externalId: "50337820",
    name: "GLADOM 글라돔 트레이테이블 화이트",
    category: "거실가구",
    price: 17900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/gladom-tray-table-white-50337820/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "작은 거실·원룸에서 이동 가능한 실제 트레이테이블입니다.",
  },
  {
    id: "ikea-stockholm-coffee-table",
    externalId: "90353078",
    name: "STOCKHOLM 스톡홀름 커피테이블 호두나무무늬목",
    category: "거실가구",
    price: 379000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/stockholm-coffee-table-walnut-veneer-90353078/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "100만 원대 예산에서 거실 중심을 실제 고급 커피테이블로 바꿉니다.",
  },
  {
    id: "ikea-nesna-bedside-table",
    externalId: "20247128",
    name: "NESNA 네스나 침대협탁 대나무",
    category: "가구",
    price: 19900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/nesna-bedside-table-bamboo-20247128/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "대나무 소재 협탁으로 우드톤 침실에 잘 맞는 실제 상품입니다.",
  },
  {
    id: "ikea-tonstad-bedside-table",
    externalId: "60489323",
    name: "TONSTAD 톤스타드 침대협탁 참나무무늬목",
    category: "가구",
    price: 159000,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/tonstad-bedside-table-oak-veneer-60489323/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "예산이 충분할 때 침대 옆의 완성도를 올리는 실제 협탁입니다.",
  },
  {
    id: "ikea-groetan-chair-beige",
    externalId: "90610426",
    name: "GRÖTÅN 그뢰톤 의자 다크베이지",
    category: "가구",
    price: 39900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/groetan-chair-tibbleby-dark-beige-90610426/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "베이지 톤 작업·식탁 의자로 기존 책상 유지 시에도 어울립니다.",
  },
  {
    id: "ikea-roedalm-frame-walnut",
    externalId: "50550108",
    name: "RÖDALM 뢰달름 액자 호두나무 무늬",
    category: "소품",
    price: 27900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/roedalm-frame-walnut-effect-50550108/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "벽면에 우드톤 장식 포인트를 만드는 실제 액자입니다.",
  },
  {
    id: "ikea-pjaetteryd-forest-fairy-tale",
    externalId: "10614131",
    name: "PJÄTTERYD 피에테뤼드 그림 숲속의 동화",
    category: "소품",
    price: 27900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/pjaetteryd-picture-forest-fairy-tale-10614131/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "지브리풍·숲·동화 컨셉을 실제 그림 상품으로 반영합니다.",
  },
  {
    id: "ikea-fejka-grass-pot",
    externalId: "90508457",
    name: "FEJKA 페이카 인조식물+화분 풀",
    category: "소품",
    price: 19900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/fejka-artificial-potted-plant-with-pot-in-outdoor-grass-90508457/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "관리 부담 없이 실제 화분 소품으로 방에 생기를 더합니다.",
  },
  {
    id: "ikea-fejka-monstera-small",
    externalId: "40593207",
    name: "FEJKA 페이카 인조식물+화분 몬스테라",
    category: "소품",
    price: 1500,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/fejka-artificial-potted-plant-with-pot-in-outdoor-monstera-40593207/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "저예산에서도 실제 소형 식물 포인트를 추가할 수 있습니다.",
  },
  {
    id: "ikea-asveig-cushion-cover",
    externalId: "40626420",
    name: "ÅSVEIG 오스베이그 쿠션커버 라이트베이지",
    category: "패브릭",
    price: 12900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/asveig-cushion-cover-light-beige-40626420/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "소파·침대 위에 베이지 패브릭 포인트를 더하는 실제 쿠션커버입니다.",
  },
  {
    id: "ikea-ekguldmal-cushion-cover",
    externalId: "80566886",
    name: "EKGULDMAL 에크굴드말 쿠션커버 기하 내추럴",
    category: "패브릭",
    price: 12900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/ekguldmal-cushion-cover-geometric-natural-80566886/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "내추럴 패턴으로 거실의 포근한 컨셉을 실제 패브릭으로 보강합니다.",
  },
  {
    id: "ikea-aengslilja-bedding-white",
    externalId: "50318567",
    name: "ÄNGSLILJA 엥슬릴리아 이불커버+베개커버 화이트",
    category: "침구",
    price: 24900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/aengslilja-duvet-cover-and-pillowcase-white-50318567/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "침실을 호텔식 화이트톤으로 정리하는 실제 침구입니다.",
  },
  {
    id: "ikea-nattjasmin-bedding-white",
    externalId: "80337164",
    name: "NATTJASMIN 나티아스민 이불커버+베개커버2 화이트",
    category: "침구",
    price: 59900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/nattjasmin-duvet-cover-and-2-pillowcases-white-80337164/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "예산이 있을 때 침대의 큰 면적을 고급스럽게 바꾸는 실제 침구입니다.",
  },
  {
    id: "ikea-pildvaergmal-floral-bedding",
    externalId: "70599854",
    name: "PILDVÄRGMAL 필드베리말 이불커버+베개커버 플로럴 패턴",
    category: "침구",
    price: 39900,
    source: "이케아",
    url: "https://www.ikea.com/kr/ko/p/pildvaergmal-duvet-cover-and-pillowcase-white-floral-pattern-70599854/",
    linkType: "product-detail",
    verifiedAt: "2026-05-17",
    reason: "동화적이고 포근한 플로럴 포인트가 있는 실제 침구입니다.",
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
      productIds: [
        "ikea-dejsa-table-lamp",
        "ikea-lohals-rug",
        "ikea-ringblomma-blind-beige",
        "ikea-holmerud-side-table-oak",
        "ikea-fejka-grass-pot",
      ],
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
      productIds: [
        "ikea-nissafors-trolley-white",
        "ikea-skadis-pegboard",
        "ikea-billy-bookcase-white",
        "ikea-mosslanda-picture-ledge",
        "ikea-kabbleka-led-strip",
      ],
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
      productIds: [
        "ikea-nattjasmin-bedding-white",
        "ikea-nesna-bedside-table",
        "ikea-arstid-table-lamp",
        "ikea-stoense-rug-large",
        "ikea-ringblomma-blind-beige",
      ],
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
