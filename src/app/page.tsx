"use client";

import { ChangeEvent, useState } from "react";

import type { RenderAfterResponse } from "@/lib/after-image";
import type { DesignGenerationJob, DesignGenerationResponse, RoomAnalysis, RoomAnalysisResponse } from "@/lib/design-api";
import { buildDesignShareUrl, buildShoppingListShareText } from "@/lib/design-share";
import { composeDesignGenerationJob } from "@/lib/design-generation";
import {
  budgetPresets,
  DesignConcept,
  Product,
  getProductCompareUrl,
  getProductPlacement,
  getProductPurchaseUrl,
  getSubstitute,
  keepOptions,
  styleChips,
} from "@/lib/interior-design";

const formatter = new Intl.NumberFormat("ko-KR");

function formatWon(amount: number) {
  return `${formatter.format(amount)}원`;
}

function formatProductPrice(product: Product) {
  if (product.quantity && product.quantity > 1) {
    return `${formatWon(product.price)} (${formatWon(product.unitPrice ?? Math.round(product.price / product.quantity))} × ${product.quantity})`;
  }
  return formatWon(product.price);
}

function buildShoppingListText(concept: DesignConcept, budget: number) {
  const productLines = concept.products
    .map((product, index) => `${index + 1}. ${product.name} / ${formatProductPrice(product)} / ${product.mallName ?? product.source}\n   구매 링크: ${getProductPurchaseUrl(product)}`)
    .join("\n");

  return `[RoomFit AI] ${concept.title}\n설정 예산: ${formatWon(budget)}\n사용 금액: ${formatWon(
    concept.usedBudget,
  )}\n남은 예산: ${formatWon(budget - concept.usedBudget)}\n\n${productLines}`;
}

function buildClientDesignResponse({
  budget,
  prompt,
  generation,
  keptFurniture,
  roomAnalysis,
}: {
  budget: number;
  prompt: string;
  generation: number;
  keptFurniture: string[];
  roomAnalysis?: RoomAnalysis | null;
}): DesignGenerationResponse {
  const createdAt = new Date().toISOString();
  const productSearchMeta = {
    provider: "static-catalog" as const,
    status: "fallback" as const,
    queries: [],
    fetchedAt: createdAt,
    apiCallCount: 0,
    fallbackReason: "서버 실시간 검색 실패로 브라우저 기본 카탈로그 추천을 사용했습니다.",
    notice: "실시간 검색 실패로 기본 카탈로그 추천을 사용했습니다. 가격/재고는 외부 쇼핑몰 사정에 따라 변동될 수 있습니다.",
  };
  const job = composeDesignGenerationJob(
    { budget, prompt, generation, keptFurniture, roomAnalysis: roomAnalysis ?? null },
    {
      id: `fallback_${Date.now().toString(36)}`,
      createdAt,
      mode: "browser-fallback",
      productSearchMeta,
    },
  );

  return {
    job,
    concepts: job.concepts,
    history: job.history,
    meta: {
      jobId: job.id,
      createdAt: job.createdAt,
      budget,
      generation,
      keptFurniture,
      promptLength: prompt.length,
      mode: job.mode,
      status: job.status,
      roomAnalysisId: roomAnalysis?.id,
      productSearchMeta,
    },
  };
}

function formatJobTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

type ProductOverlayPlacement = {
  label: string;
  box: { left: string; top: string; width: string; height: string };
  arrow: { left: string; top: string; rotate: string };
};

function getProductOverlayPlacement(product: Product): ProductOverlayPlacement {
  if (product.id.includes("lohals") || product.id.includes("stoense") || product.id.includes("morun") || product.id.includes("morum") || product.category === "러그") {
    return {
      label: "바닥 러그 영역",
      box: { left: "30%", top: "56%", width: "45%", height: "27%" },
      arrow: { left: "51%", top: "49%", rotate: "90deg" },
    };
  }

  if (product.id.includes("stockholm") || product.category === "거실가구") {
    return {
      label: product.id.includes("holmerud") ? "좌측 보조테이블/휴식 코너" : "거실 중앙 테이블",
      box: product.id.includes("holmerud") ? { left: "13%", top: "57%", width: "20%", height: "22%" } : { left: "43%", top: "51%", width: "24%", height: "22%" },
      arrow: product.id.includes("holmerud") ? { left: "29%", top: "50%", rotate: "130deg" } : { left: "52%", top: "44%", rotate: "90deg" },
    };
  }

  if (product.category === "조명") {
    const isFloorLamp = product.id.includes("lauters") || product.id.includes("isjakt");
    return {
      label: isFloorLamp ? "코너 플로어 조명" : "무드 조명 포인트",
      box: isFloorLamp ? { left: "72%", top: "33%", width: "14%", height: "34%" } : { left: "13%", top: "54%", width: "17%", height: "18%" },
      arrow: isFloorLamp ? { left: "70%", top: "43%", rotate: "25deg" } : { left: "28%", top: "48%", rotate: "130deg" },
    };
  }

  if (product.category === "커튼") {
    return {
      label: "창가 패브릭 톤 정리",
      box: { left: "41%", top: "19%", width: "25%", height: "35%" },
      arrow: { left: "47%", top: "14%", rotate: "90deg" },
    };
  }

  if (product.category === "수납") {
    return {
      label: "우측 수납/정리 존",
      box: { left: "72%", top: "48%", width: "22%", height: "30%" },
      arrow: { left: "68%", top: "48%", rotate: "30deg" },
    };
  }

  if (product.category === "소품") {
    const isPlant = product.name.includes("식물") || product.name.includes("화분");
    return {
      label: isPlant ? "초록 식물 포인트" : "벽/선반 장식 포인트",
      box: isPlant ? { left: "70%", top: "33%", width: "18%", height: "37%" } : { left: "79%", top: "37%", width: "15%", height: "16%" },
      arrow: isPlant ? { left: "68%", top: "39%", rotate: "35deg" } : { left: "75%", top: "34%", rotate: "40deg" },
    };
  }

  if (product.category === "패브릭" || product.category === "침구") {
    return {
      label: "좌식 쿠션/패브릭 영역",
      box: { left: "23%", top: "54%", width: "22%", height: "24%" },
      arrow: { left: "39%", top: "50%", rotate: "120deg" },
    };
  }

  return {
    label: "구매 참고 위치",
    box: { left: "42%", top: "45%", width: "22%", height: "22%" },
    arrow: { left: "46%", top: "39%", rotate: "90deg" },
  };
}

function getConceptDecisionGuide(concept: DesignConcept) {
  const categories = Array.from(new Set(concept.products.map((product) => product.category))).slice(0, 4).join(" · ") || "상품 조합";

  if (concept.title.includes("수납") || concept.title.includes("정리")) {
    return {
      bestFor: "바닥·책상 주변 생활감이 가장 거슬릴 때",
      impact: "정리 후 넓어 보이는 체감 변화",
      tradeoff: "사진 분위기보다 수납/동선 개선을 우선합니다.",
      firstAction: "이동식 수납과 정리 소품부터 구매",
      categories,
    };
  }

  if (concept.title.includes("조명") || concept.title.includes("패브릭") || concept.title.includes("무드")) {
    return {
      bestFor: "Before/After 사진 차이를 크게 만들고 싶을 때",
      impact: "조명·러그·커튼으로 분위기 즉시 전환",
      tradeoff: "수납 문제 해결력은 상대적으로 낮습니다.",
      firstAction: "조명과 큰 면적 패브릭부터 교체",
      categories,
    };
  }

  return {
    bestFor: "한쪽으로 치우치지 않고 실패 확률을 낮추고 싶을 때",
    impact: "예산 안에서 수납·조명·톤 보정을 균형 있게 정리",
    tradeoff: "가장 강한 한 방보다는 안전한 평균점을 선택합니다.",
    firstAction: "체감 변화가 큰 상위 3개부터 구매",
    categories,
  };
}

export default function Home() {
  const [budget, setBudget] = useState(300000);
  const [prompt, setPrompt] = useState("");
  const [keptFurniture, setKeptFurniture] = useState<string[]>([]);
  const [generation, setGeneration] = useState(1);
  const [concepts, setConcepts] = useState<DesignConcept[]>(() => buildClientDesignResponse({ budget: 300000, prompt: "", generation: 1, keptFurniture: [] }).concepts);
  const [conceptHistory, setConceptHistory] = useState<DesignConcept[]>(() => buildClientDesignResponse({ budget: 300000, prompt: "", generation: 1, keptFurniture: [] }).history);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [roomImageDataUrl, setRoomImageDataUrl] = useState<string | null>(null);
  const [generatedAfterImages, setGeneratedAfterImages] = useState<Record<string, string>>({});
  const [renderedProductIds, setRenderedProductIds] = useState<Record<string, string | null>>({});
  const [afterImageNotice, setAfterImageNotice] = useState("분위기 참고 이미지는 분위기 예시입니다. 실제 구매 판단은 이미지 생성 후 표시되는 상품 카드 기준으로 확인하세요.");
  const [isRenderingAfter, setIsRenderingAfter] = useState(false);
  const [copyStatus, setCopyStatus] = useState("쇼핑 리스트 복사");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  const [analysisNotice, setAnalysisNotice] = useState("사진을 올리면 업로드 상태만 확인합니다. 구매 플랜은 사용자가 입력한 프롬프트와 예산을 우선 기준으로 만듭니다.");
  const [apiNotice, setApiNotice] = useState("검증된 상품 카탈로그에서 예산에 맞는 구매 조합을 추천합니다.");
  const [apiNoticeTone, setApiNoticeTone] = useState<"neutral" | "success" | "warning">("neutral");
  const [currentJob, setCurrentJob] = useState<DesignGenerationJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<DesignGenerationJob[]>([]);
  const [shareStatus, setShareStatus] = useState("공유 링크 복사");
  const [hasGeneratedDesign, setHasGeneratedDesign] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const selectedConcept =
    concepts.find((concept) => concept.id === selectedConceptId) ??
    conceptHistory.find((concept) => concept.id === selectedConceptId) ??
    concepts[0];
  const remainingBudget = budget - selectedConcept.usedBudget;
  const isPromptReady = prompt.trim().length >= 8;
  const isBudgetTight = selectedConcept.usedBudget > budget;
  const generatedAfterImage = generatedAfterImages[selectedConcept.id];
  const activeProduct = selectedConcept.products.find((product) => product.id === activeProductId) ?? null;
  const productCompositeTarget = (activeProduct?.imageUrl ? activeProduct : selectedConcept.products.find((product) => product.imageUrl)) ?? null;
  const renderedProduct = selectedConcept.products.find((product) => product.id === renderedProductIds[selectedConcept.id]) ?? null;
  const visibleProductCompositeTarget = generatedAfterImage ? renderedProduct : productCompositeTarget;
  const visibleProductPlacement = visibleProductCompositeTarget ? getProductOverlayPlacement(visibleProductCompositeTarget) : null;
  const canShowImageProductMapping = Boolean(generatedAfterImage);
  const mustBuyProducts = selectedConcept.products.slice(0, Math.min(3, selectedConcept.products.length));
  const niceToHaveProducts = selectedConcept.products.slice(mustBuyProducts.length);
  const planCompletionPercent = Math.min(100, Math.round((selectedConcept.usedBudget / Math.max(budget, 1)) * 100));
  const keptFurnitureText = keptFurniture.length > 0 ? keptFurniture.join(" · ") : "큰 가구는 최대한 유지";
  const furnitureOptions = roomAnalysis?.detectedFurniture.length ? roomAnalysis.detectedFurniture : keepOptions;

  const refreshRecentJobs = async () => {
    try {
      const response = await fetch("/api/designs", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { jobs: DesignGenerationJob[] };
      setRecentJobs(data.jobs.slice(0, 5));
    } catch {
      // Recent jobs are a convenience panel; generation should continue even if this fails.
    }
  };

  const applyDesignResponse = (data: DesignGenerationResponse, nextGeneration: number) => {
    setConcepts(data.concepts);
    setConceptHistory(data.history);
    setCurrentJob(data.job);
    setShareStatus("공유 링크 복사");
    setGeneration(nextGeneration);
    setSelectedConceptId(data.concepts[0]?.id ?? null);
    setActiveProductId(null);
    setHasGeneratedDesign(true);
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setRoomImageDataUrl(null);
    setGeneratedAfterImages({});
    setRenderedProductIds({});
    setAfterImageNotice("원본 방 사진을 분위기 참고 이미지 생성용으로 준비하는 중입니다...");
    setIsAnalyzing(true);
    setAnalysisNotice("사진을 업로드하는 중입니다. 공간명·채광·생활감은 자동 확정하지 않습니다.");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRoomImageDataUrl(dataUrl);
      setAfterImageNotice("방 사진 업로드 완료. 분위기 참고 이미지는 예시이며 이미지 속 가구/소품은 실제 상품 형태와 다를 수 있습니다.");

      const formData = new FormData();
      formData.append("roomImage", file);

      const response = await fetch("/api/room-analysis", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Room analysis API failed");
      }

      const data = (await response.json()) as RoomAnalysisResponse;
      setRoomAnalysis(null);
      setAnalysisNotice("사진 업로드 완료. 현재 사진 판독은 자동 추정용이므로 화면에 확정 분석으로 표시하지 않고, 구매 플랜은 입력한 프롬프트와 예산을 우선합니다.");
      setApiNotice(
        hasGeneratedDesign
          ? "사진이 바뀌었습니다. 다시 시안 만들기를 누르면 입력한 프롬프트와 예산 기준으로 새 추천을 만듭니다."
          : "사진 업로드가 완료되었습니다. 예산과 취향을 확인한 뒤 시안 만들기를 누르면 추천을 시작합니다.",
      );
      setApiNoticeTone("neutral");
    } catch {
      setRoomAnalysis(null);
      setAnalysisNotice("사진 업로드 확인에 실패했습니다. 시안 생성은 텍스트 조건만으로 계속할 수 있습니다.");
      setAfterImageNotice((current) =>
        current.includes("준비 완료") ? current : "이미지 파일을 읽지 못했습니다. 방 사진을 다시 올려주세요.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleFurniture = (item: string) => {
    setKeptFurniture((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  };

  const generateAgain = async () => {
    if (!isPromptReady) {
      setApiNotice("원하는 분위기/조건을 조금 더 구체적으로 입력하면 시안을 생성할 수 있습니다.");
      setApiNoticeTone("warning");
      return;
    }

    const nextGeneration = generation + 1;
    setIsGenerating(true);
    setSelectedConceptId(null);
    setActiveProductId(null);
    setCopyStatus("쇼핑 리스트 복사");
    setApiNotice("예산과 프롬프트 기준으로 구매 후보 리스트를 준비하는 중입니다...");
    setApiNoticeTone("neutral");
    setAfterImageNotice(roomImageDataUrl ? "예산과 프롬프트 기준의 구매 후보를 준비했습니다. 분위기 참고 이미지를 생성한 뒤 별도 상품 리스트를 확인할 수 있습니다." : "분위기 참고 이미지를 만들려면 먼저 방 사진을 업로드해 주세요. 실제 구매 판단은 상품 카드 기준입니다.");

    try {
      const response = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, prompt, generation: nextGeneration, keptFurniture, roomAnalysis }),
      });

      if (!response.ok) {
        throw new Error("Design API failed");
      }

      const data = (await response.json()) as DesignGenerationResponse;
      applyDesignResponse(data, nextGeneration);
      setApiNotice(
        "시안 방향과 구매 후보 리스트를 준비했습니다.",
      );
      setApiNoticeTone("success");
      void refreshRecentJobs();
    } catch {
      const fallbackData = buildClientDesignResponse({ budget, prompt, generation: nextGeneration, keptFurniture, roomAnalysis });
      applyDesignResponse(fallbackData, nextGeneration);
      setApiNotice("실시간 검색이 원활하지 않아 기본 카탈로그 후보로 시안을 만들었습니다. 실제 가격/재고는 판매처에서 다시 확인해 주세요.");
      setApiNoticeTone("warning");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTextToClipboard = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const copyShoppingList = () => {
    if (currentJob) {
      copyTextToClipboard(buildShoppingListShareText(currentJob, buildDesignShareUrl(window.location.origin, currentJob.id)));
    } else {
      copyTextToClipboard(buildShoppingListText(selectedConcept, budget));
    }
    setCopyStatus("복사 완료");
  };

  const copyJobShareLink = () => {
    if (!currentJob) return;
    copyTextToClipboard(buildDesignShareUrl(window.location.origin, currentJob.id));
    setShareStatus("링크 복사 완료");
  };

  const renderAfterImage = async () => {
    if (!roomImageDataUrl) {
      setAfterImageNotice("분위기 참고 이미지를 만들려면 먼저 방 사진을 업로드해 주세요.");
      return;
    }

    setIsRenderingAfter(true);
    setAfterImageNotice("분위기 참고 이미지를 생성하는 중입니다. 보통 20~60초 정도 걸립니다.");

    try {
      const response = await fetch("/api/render-after", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: roomImageDataUrl,
          concept: selectedConcept,
          userPrompt: prompt,
          keptFurniture,
          productReference: productCompositeTarget?.imageUrl
            ? {
                id: productCompositeTarget.id,
                name: productCompositeTarget.name,
                category: productCompositeTarget.category,
                imageUrl: productCompositeTarget.imageUrl,
                source: productCompositeTarget.source,
                url: productCompositeTarget.url,
              }
            : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<RenderAfterResponse> & { error?: string };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error ?? "이미지 생성 API 호출이 실패했습니다.");
      }

      setGeneratedAfterImages((current) => ({ ...current, [selectedConcept.id]: data.imageUrl ?? "" }));
      setRenderedProductIds((current) => ({ ...current, [selectedConcept.id]: data.mode === "product-composite-edit" ? productCompositeTarget?.id ?? null : null }));
      setAfterImageNotice(
        data.mode === "product-composite-edit"
          ? "선택 상품 이미지 1개를 원본 사진 위에 먼저 올린 뒤 조명·그림자·색감을 보정했습니다. 상품 정체성은 원본 썸네일과 비교해 검수하세요."
          : "분위기 참고 이미지 생성 완료. 이미지 속 가구/소품은 실제 상품 형태와 다를 수 있습니다. 상품 후보는 이미지와 별도로 확인하세요.",
      );
    } catch {
      setAfterImageNotice("분위기 참고 이미지 생성에 실패했습니다. 예산과 프롬프트 기준의 구매 후보 리스트는 계속 확인할 수 있습니다.");
    } finally {
      setIsRenderingAfter(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden text-[#222222]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-5 py-6 sm:px-8 lg:px-10">
        <nav className="sticky top-4 z-50 flex items-center justify-between rounded-full border border-black/5 bg-white/85 px-4 py-3 shadow-[var(--commercial-shadow)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-2 font-black tracking-tight"><span className="flex size-8 items-center justify-center rounded-full bg-[#ff385c] text-white shadow-lg shadow-rose-500/25">R</span><span>RoomFit AI</span></div>
          <div className="hidden items-center gap-6 text-sm font-bold text-slate-500 md:flex">
            <a href="#demo" className="hover:text-[#222222]">데모</a>
            <span>구매 가능한 상품</span>
            <span>예산 고정</span>
          </div>
          <a href="#demo" className="rounded-full bg-[#ff385c] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#e00b41]">
            무료 데모 시작
          </a>
        </nav>

        <div className="relative grid gap-10 py-4 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-sm font-black text-[#ff385c] shadow-sm backdrop-blur">
              일반 AI와 다른 점: 예산 고정 · 시안 비교 · 쇼핑 리스트 자동화
            </div>
            <div className="space-y-6">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.05em] text-[#222222] sm:text-5xl lg:text-6xl">
                <span className="block">내 방 사진 한 장으로,</span>
                <span className="block">예산 안에서 비교하는</span>
                <span className="block">AI 인테리어 시안</span>
              </h1>
              <p className="max-w-2xl text-lg font-medium leading-8 text-[#6a6a6a] sm:text-xl">
                방 사진과 예산만 입력하면, 실제 구매 가능한 상품 후보와 분위기 시안을 예산 안에서 비교해드립니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["01", "프롬프트 자동 보정"],
                ["02", "예산 맞춤 상품 추천"],
                ["03", "구매 링크 바로 확인"],
              ].map(([number, label]) => (
                <div key={number} className="rounded-[1.5rem] bg-white/85 p-4 shadow-[var(--commercial-shadow)] ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-1">
                  <div className="text-sm font-black text-[#ff385c]">{number}</div>
                  <div className="mt-2 font-bold">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-3 shadow-[var(--commercial-shadow)]">
            <div className={`h-80 rounded-[1.5rem] ${selectedConcept.palette} p-5 text-slate-950`}>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/35 p-5 backdrop-blur-sm">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">시안 방향 미리보기</div>
                  <h2 className="text-2xl font-black">{selectedConcept.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-700">{selectedConcept.strategy}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
                  <div className="rounded-2xl bg-white/80 p-3">예산 적합도<br />{selectedConcept.budgetFitScore}점</div>
                  <div className="rounded-2xl bg-white/80 p-3">실행 난이도<br />쉬움</div>
                  <div className="rounded-2xl bg-white/80 p-3">사용 금액<br />{formatWon(selectedConcept.usedBudget)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="demo" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-[var(--commercial-shadow)] sm:p-7">
            <div className="mb-6">
              <p className="text-sm font-black text-[#ff385c]">STEP 1</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">방 사진, 예산, 취향만 입력하세요</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">상품명을 상상하지 않고, 실제 상품 상세 링크가 있는 후보 안에서 예산에 맞는 조합을 바꿔가며 시안을 만듭니다.</p>
            </div>

            <label className="group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-rose-200 bg-rose-50/50 p-4 text-center transition hover:-translate-y-0.5 hover:bg-rose-50">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="업로드한 방 사진 미리보기" className="h-48 w-full rounded-2xl bg-slate-900 object-contain" />
              ) : (
                <div>
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white text-2xl text-[#ff385c] shadow-sm">＋</div>
                  <p className="font-bold">방 사진 업로드</p>
                  <p className="mt-1 text-sm text-slate-500">사진을 올리면 참고 이미지 생성 준비를 합니다</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
            </label>

            <div className={`mt-4 rounded-3xl p-4 text-sm ${roomAnalysis ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-600"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">사진 업로드 상태</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                  {isAnalyzing ? "확인 중" : previewUrl ? "업로드 완료" : "대기"}
                </span>
              </div>
              <p className="mt-2 leading-6">{analysisNotice}</p>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="prompt" className="text-sm font-bold">원하는 분위기/조건</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="예: 블랙·그레이 톤의 모던한 작업방으로, 책상은 그대로 두고 케이블과 수납을 정리하고 싶어요."
                  aria-invalid={!isPromptReady}
                  className="mt-2 min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-amber-400 focus:bg-white"
                />
                <p className={`mt-2 text-xs font-bold ${isPromptReady ? "text-slate-400" : "text-rose-600"}`}>
                  {isPromptReady ? "충분한 조건이 입력되었습니다." : "분위기/조건을 8자 이상 입력해 주세요."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {styleChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPrompt((current) => `${current} ${chip}`)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="budget" className="text-sm font-bold">설정 예산</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {budgetPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBudget(preset)}
                      className={`rounded-2xl px-3 py-3 text-sm font-bold transition ${
                        budget === preset ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {formatWon(preset)}
                    </button>
                  ))}
                </div>
                <input
                  id="budget"
                  type="number"
                  min={50000}
                  step={10000}
                  value={budget}
                  onChange={(event) => setBudget(Math.max(0, Number(event.target.value)))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:bg-white"
                />
                {isBudgetTight ? (
                  <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    현재 선택 시안이 예산을 초과합니다. 예산을 올리거나 다시 생성하면 더 저렴한 조합을 찾습니다.
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-bold">유지할 가구</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {furnitureOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleFurniture(item)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        keptFurniture.includes(item) ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={generateAgain}
                disabled={isGenerating || !isPromptReady}
                className="w-full rounded-full bg-[#ff385c] px-5 py-4 text-base font-black text-white shadow-xl shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#e00b41] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {isGenerating ? "시안 생성 중..." : hasGeneratedDesign ? "조건 기준으로 다시 만들기" : "시안 만들기"}
              </button>
              <div
                className={`rounded-3xl px-4 py-3 text-center text-xs font-bold ${
                  apiNoticeTone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : apiNoticeTone === "warning"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-50 text-slate-500"
                }`}
              >
                {apiNotice}
              </div>

              {isGenerating ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <div className="mx-auto size-10 animate-spin rounded-full border-4 border-amber-200 border-t-slate-950" />
                  <p className="mt-4 text-sm font-black text-slate-900">실시간 상품 검색 후 예산 안의 구매 조합을 계산하는 중입니다.</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">완료되면 바로 아래에 Step 2 선택지와 Step 3 구매 플랜이 함께 나타납니다. 가격/재고는 판매처에서 변동될 수 있습니다.</p>
                </div>
              ) : null}

              {currentJob ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-500">준비된 시안</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">공유 가능한 결과가 준비되었습니다</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                      {currentJob.productSearchMeta?.status === "live"
                        ? "실시간 검색 상품"
                        : currentJob.productSearchMeta?.status === "partial-fallback"
                          ? "실시간+기본 카탈로그"
                          : currentJob.mode === "real-product-composition"
                            ? "기본 카탈로그 추천"
                            : "기본 추천 결과"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
                    <div className="rounded-2xl bg-white p-3">준비 시각<br />{formatJobTime(currentJob.createdAt)}</div>
                    <div className="rounded-2xl bg-white p-3">예산 적합도<br />{currentJob.metrics.averageBudgetFitScore}점</div>
                    <div className="rounded-2xl bg-white p-3">선택지<br />{currentJob.metrics.conceptCount}개</div>
                  </div>
                  {currentJob.roomAnalysis ? (
                    <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">
                      입력 조건 기준: 사진 업로드 완료 · 예산과 프롬프트 우선
                    </p>
                  ) : null}
                  {currentJob.productSearchMeta ? (
                    <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold leading-5 text-amber-700">
                      {currentJob.productSearchMeta.notice}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={copyJobShareLink}
                    className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white"
                  >
                    {shareStatus}
                  </button>
                  <a
                    href={`/designs/${currentJob.id}`}
                    className="mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-center text-xs font-black text-slate-900 shadow-sm"
                  >
                    공유 상세 페이지 열기
                  </a>
                </div>
              ) : null}

              {recentJobs.length > 0 ? (
                <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-amber-700">최근 만든 시안</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">이전에 준비한 시안을 다시 열 수 있습니다.</p>
                    </div>
                    <button type="button" onClick={refreshRecentJobs} className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                      새로고침
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recentJobs.map((job) => (
                      <a key={job.id} href={`/designs/${job.id}`} className="block rounded-2xl bg-white px-3 py-3 text-xs font-bold text-slate-700 shadow-sm hover:text-slate-950">
                        <span>{job.concepts[0]?.title ?? "인테리어 시안"}</span>
                        <span className="mx-2 text-slate-300">·</span>
                        <span>{formatJobTime(job.createdAt)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {hasGeneratedDesign ? (
            <div className="space-y-6">
            <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-[var(--commercial-shadow)] sm:p-7">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black text-[#ff385c]">STEP 2</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] sm:text-3xl">구매 방향을 선택하세요</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    가성비 우선, 균형, 분위기 우선 중 하나를 고르면 예산 배분과 상품 구성이 달라집니다. 마음에 드는 방향을 고른 뒤 분위기 참고 이미지를 생성하고, 실제 구매 후보를 확인하세요.
                  </p>
                </div>
                <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">유지: {keptFurniture.join(", ") || "직접 선택 없음"}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-500">현재 판단 기준</div>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
                      {roomAnalysis
                        ? `${roomAnalysis.roomType} · 채광 ${roomAnalysis.lightLevel} · 생활감 ${roomAnalysis.clutterLevel}`
                        : "입력한 예산/취향 기준"}
                    </p>
                  </div>
                  <div className="text-xs font-bold leading-5 text-slate-500 sm:text-right">
                    선택한 방향: <span className="text-[#ff385c]">{selectedConcept.title}</span><br />
                    예상 예산: {formatWon(selectedConcept.usedBudget)} / {formatWon(budget)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {concepts.map((concept) => {
                  const isSelected = selectedConcept.id === concept.id;
                  const guide = getConceptDecisionGuide(concept);

                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => {
                        setSelectedConceptId(concept.id);
                        setActiveProductId(null);
                      }}
                      className={`flex h-full flex-col rounded-[1.75rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                        isSelected ? "border-[#ff385c] bg-[#222222] text-white shadow-xl shadow-slate-950/15" : "border-slate-200 bg-white hover:border-rose-300 hover:shadow-lg"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${isSelected ? "bg-[#ff385c] text-white" : "bg-rose-50 text-[#ff385c]"}`}>
                            {isSelected ? "현재 선택" : "선택 가능"}
                          </div>
                          <h3 className="text-lg font-black">{concept.title}</h3>
                        </div>
                        <div className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-black ${isSelected ? "bg-white/15" : "bg-slate-100 text-slate-900"}`}>{formatWon(concept.usedBudget)}</div>
                      </div>

                      <p className={`mt-3 text-sm leading-6 ${isSelected ? "text-slate-200" : "text-slate-600"}`}>{concept.strategy}</p>

                      <div className="mt-4 grid gap-2 text-xs font-bold">
                        <div className={`rounded-2xl p-3 ${isSelected ? "bg-white/10 text-white" : "bg-slate-50 text-slate-700"}`}>
                          <span className={isSelected ? "text-rose-200" : "text-[#ff385c]"}>이런 경우 선택</span><br />{guide.bestFor}
                        </div>
                        <div className={`rounded-2xl p-3 ${isSelected ? "bg-white/10 text-white" : "bg-slate-50 text-slate-700"}`}>
                          <span className={isSelected ? "text-rose-200" : "text-[#ff385c]"}>첫 실행</span><br />{guide.firstAction}
                        </div>
                        <div className={`rounded-2xl p-3 ${isSelected ? "bg-white/10 text-white" : "bg-slate-50 text-slate-700"}`}>
                          <span className={isSelected ? "text-rose-200" : "text-[#ff385c]"}>포기하는 점</span><br />{guide.tradeoff}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-center sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                        <Score label="예산" value={concept.budgetFitScore} active={isSelected} />
                        <Score label="구매" value={concept.feasibilityScore} active={isSelected} />
                        <Score label="구조" value={concept.roomStructureScore} active={isSelected} />
                      </div>

                      <div className={`mt-4 rounded-2xl px-3 py-2 text-xs font-bold ${isSelected ? "bg-white/10 text-slate-200" : "bg-amber-50 text-amber-800"}`}>
                        핵심 품목: {guide.categories}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 rounded-3xl bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-900">선택 후 달라지는 것</div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">Step 3 구매 우선순위가 선택한 방향 기준으로 바뀝니다.</div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">수정 후 이미지 생성 프롬프트는 선택 시안의 카테고리와 분위기 전략을 참고합니다.</div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">유지할 가구는 Step 1에서 직접 선택한 항목만 기준으로 삼습니다.</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-[#222222] p-5 text-white shadow-[var(--commercial-shadow)] sm:p-7">
              <p className="text-sm font-black text-rose-300">STEP 3</p>
              <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">예산 안에서 이 방 완성하기</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    먼저 시안 방향을 고르고 분위기 참고 이미지를 생성하세요. 이미지는 분위기 예시이며, 실제 구매 판단은 이미지 생성 후 표시되는 상품 카드 기준입니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyShoppingList}
                  disabled={!canShowImageProductMapping}
                  className="rounded-full bg-[#ff385c] px-4 py-2 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:translate-y-0"
                >
                  {canShowImageProductMapping ? copyStatus : "이미지 생성 후 리스트 복사"}
                </button>
              </div>

              <div className="mt-5 grid gap-2 text-center text-sm font-bold sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-3">설정 예산<br />{formatWon(budget)}</div>
                <div className="rounded-2xl bg-white/10 p-3">사용 금액<br />{formatWon(selectedConcept.usedBudget)}</div>
                <div className="rounded-2xl bg-white/10 p-3">남은 예산<br />{formatWon(remainingBudget)}</div>
                <div className="rounded-2xl bg-[#ff385c] p-3 text-white">예산 활용<br />{planCompletionPercent}%</div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl bg-white/10 p-4">
                  <div className="text-xs font-black text-amber-200">유지할 것</div>
                  <p className="mt-2 text-sm font-bold leading-6 text-white">{keptFurnitureText}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">월세방/자취방 기준으로 큰 가구와 구조 변경은 최소화합니다.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <div className="text-xs font-black text-amber-200">바꿀 것</div>
                  <p className="mt-2 text-sm font-bold leading-6 text-white">{selectedConcept.products.slice(0, 3).map((product) => product.category).join(" · ")}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">구매 후보 카테고리와 요청한 분위기를 중심으로 참고 이미지를 만듭니다.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <div className="text-xs font-black text-amber-200">확인 순서</div>
                  <p className="mt-2 text-sm font-bold leading-6 text-white">분위기 참고 이미지 확인 후 상품 카드 열람</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">이미지는 분위기 참고용이고 실제 구매는 카드 기준입니다.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[2rem] bg-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs font-black text-slate-300">
                    <span>수정 전 · 현재 방</span>
                    <span>원본 사진</span>
                  </div>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="원본 방 사진" className="h-72 w-full rounded-[1.5rem] bg-slate-900 object-contain sm:h-96 lg:h-[30rem]" />
                  ) : (
                    <div className="flex h-72 items-center justify-center rounded-[1.5rem] bg-slate-800 text-sm text-slate-400 sm:h-96 lg:h-[30rem]">업로드한 방 사진 영역</div>
                  )}
                </div>
                <div className="rounded-[2rem] bg-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs font-black text-slate-300">
                    <span>수정 후 · {generatedAfterImage ? "분위기 참고 이미지" : "시안 스타일 참고"}</span>
                    <span>{generatedAfterImage ? "구매 후보 리스트 확인 가능" : "구매 후보 리스트 준비됨"}</span>
                  </div>
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-900">
                    {generatedAfterImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={generatedAfterImage} alt={`${selectedConcept.title} 분위기 참고 이미지`} className="h-72 w-full object-contain sm:h-96 lg:h-[30rem]" />
                    ) : (
                      <div className={`relative flex h-72 overflow-hidden rounded-[1.5rem] ${selectedConcept.palette} p-5 text-slate-950 sm:h-96 lg:h-[30rem]`}>
                        <div className="absolute left-8 top-8 h-24 w-36 rounded-3xl bg-white/55 shadow-sm" />
                        <div className="absolute right-8 top-12 h-36 w-24 rounded-3xl bg-white/45 shadow-sm" />
                        <div className="absolute bottom-10 left-1/2 h-20 w-56 -translate-x-1/2 rounded-[999px] bg-white/45 shadow-sm" />
                        <div className="relative z-10 mt-auto w-full rounded-3xl bg-white/85 p-4 text-sm font-black shadow-sm backdrop-blur">
                          <div className="flex flex-wrap gap-1">
                            {selectedConcept.highlights.slice(0, 3).map((highlight) => (
                              <span key={highlight} className="rounded-full bg-slate-950 px-2 py-1 text-[10px] text-white">
                                {highlight}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-slate-700">대표 구성: {selectedConcept.products.slice(0, 3).map((product) => product.category).join(" · ")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {visibleProductCompositeTarget ? (
                    <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-bold leading-5 text-slate-200">
                      <div className="flex items-center gap-3">
                        {visibleProductCompositeTarget.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={visibleProductCompositeTarget.imageUrl} alt={`${visibleProductCompositeTarget.name} 상품 이미지`} className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain" />
                        ) : null}
                        <div className="min-w-0">
                          <p className="text-amber-100">{generatedAfterImage ? "C안 1상품 결과 검증 대상" : "C안 1상품 검증 예정"}: {visibleProductPlacement?.label ?? "단순 프리셋 영역"}</p>
                          <p className="truncate text-slate-300">{visibleProductCompositeTarget.name} · {formatWon(visibleProductCompositeTarget.price)}</p>
                          <p className="text-slate-400">{generatedAfterImage ? "이번 결과 이미지에 사용된 상품 썸네일입니다. 정체성 유지 여부를 비교하세요." : "이미지 생성 시 이 상품을 먼저 방 사진 위에 올려본 뒤 보정합니다."}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-bold leading-5 text-slate-300">
                      {generatedAfterImage
                        ? "이번 결과는 C안 상품 합성이 아니라 기존 분위기 참고 이미지로 생성되었습니다."
                        : "이미지 URL이 있는 상품이 없어 C안 합성 대신 기존 분위기 참고 이미지로 진행합니다."}
                    </div>
                  )}
                  <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-bold leading-5 text-slate-300">
                    {afterImageNotice}
                  </div>
                  <button
                    type="button"
                    onClick={renderAfterImage}
                    disabled={isRenderingAfter || !roomImageDataUrl}
                    className="mt-3 w-full rounded-2xl bg-[#ff385c] px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e00b41] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:translate-y-0"
                  >
                    {isRenderingAfter ? "분위기 참고 이미지 생성 중..." : generatedAfterImage ? "분위기 참고 이미지 다시 생성" : "분위기 참고 이미지 생성"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-amber-300/40 bg-amber-300/10 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-black text-amber-200">
                      {canShowImageProductMapping ? "예산 기준 구매 후보 리스트" : "분위기 참고 이미지 생성 후 별도 상품 리스트 확인"}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      {canShowImageProductMapping
                        ? "아래 상품 리스트는 이미지 속 물건과 1:1 일치하지 않습니다. 실제 구매 판단은 상품 카드 기준이며, 상품 후보는 이미지와 별도로 확인하세요."
                        : "아직 분위기 참고 이미지가 생성되지 않았습니다. 예산과 프롬프트 기준의 구매 후보를 준비했으며, 이미지 생성 후 별도 상품 리스트로 확인할 수 있습니다."}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">총 {selectedConcept.products.length}개 · {formatWon(selectedConcept.usedBudget)}</span>
                </div>
                {canShowImageProductMapping ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedConcept.products.map((product, index) => (
                      <a
                        key={`used-${product.id}`}
                        href={getProductPurchaseUrl(product)}
                        target="_blank"
                        rel="noreferrer"
                        onMouseEnter={() => setActiveProductId(product.id)}
                        onFocus={() => setActiveProductId(product.id)}
                        onClick={() => setActiveProductId(product.id)}
                        className={`group rounded-2xl bg-white p-3 text-slate-950 shadow-sm ring-2 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${activeProductId === product.id ? "ring-amber-300" : "ring-transparent"}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">{index + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black">{product.name}</div>
                            <div className="mt-1 text-[11px] font-bold text-slate-500">{product.source} 바로 열기 · {formatProductPrice(product)}</div>
                            <div className="mt-1 text-[11px] font-semibold text-amber-700 group-hover:underline">구매 참고 위치: {getProductPlacement(product)}</div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-amber-300/50 bg-slate-950/20 p-4 text-center text-xs font-bold leading-5 text-slate-300">
                    먼저 위의 “분위기 참고 이미지 생성” 버튼을 눌러 이미지 결과를 확인한 뒤, 예산과 프롬프트 기준의 별도 구매 후보 리스트를 확인하세요.
                  </div>
                )}
              </div>

              {canShowImageProductMapping ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-amber-200">먼저 확인할 구매 후보</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">이미지 확인 후 노출</span>
                  </div>
                  <div className="space-y-3">
                    {mustBuyProducts.map((product, index) => {
                      const substitute = getSubstitute(product);
                      const purchaseUrl = getProductPurchaseUrl(product);
                      const compareUrl = getProductCompareUrl(product);
                      const placement = getProductPlacement(product);

                      return (
                        <div key={product.id} className="rounded-3xl bg-white p-4 text-slate-950">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                              <div className="text-xs font-bold text-amber-700">{index + 1}순위 · {product.category} · {product.mallName ?? product.source}</div>
                              <h3 className="mt-1 font-black">{product.name}</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{product.reason}</p>
                              <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                구매 참고 영역: {placement}
                              </p>
                              <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                역할: {selectedConcept.highlights[index] ?? "시안 방향에 맞는 구매 후보"}
                              </p>
                              {product.availabilityNote ? (
                                <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                  {product.availabilityNote} · 생성 시점 참고 가격
                                </p>
                              ) : null}
                              {substitute ? (
                                <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                  저가 대체안: {substitute.name} · {formatWon(substitute.price)}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                              <span className="font-black">{formatProductPrice(product)}</span>
                              <a href={purchaseUrl} target="_blank" rel="noreferrer" className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white">
                                {product.source}에서 열기
                              </a>
                              <a href={compareUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-4 py-2 text-center text-xs font-bold text-slate-700">
                                네이버 가격 비교
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {niceToHaveProducts.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-amber-200">있으면 좋은 추가 아이템</h3>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">예산 여유분 활용</span>
                    </div>
                    <div className="space-y-3">
                      {niceToHaveProducts.map((product, index) => {
                        const substitute = getSubstitute(product);
                        const purchaseUrl = getProductPurchaseUrl(product);
                        const compareUrl = getProductCompareUrl(product);
                        const placement = getProductPlacement(product);

                        return (
                          <div key={product.id} className="rounded-3xl bg-white/95 p-4 text-slate-950">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div>
                                <div className="text-xs font-bold text-slate-500">선택 {index + 1} · {product.category} · {product.mallName ?? product.source}</div>
                                <h3 className="mt-1 font-black">{product.name}</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{product.reason}</p>
                                <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                  구매 참고 영역: {placement}
                                </p>
                                {product.availabilityNote ? (
                                  <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                    {product.availabilityNote} · 생성 시점 참고 가격
                                  </p>
                                ) : null}
                                {substitute ? (
                                  <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                    저가 대체안: {substitute.name} · {formatWon(substitute.price)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                <span className="font-black">{formatProductPrice(product)}</span>
                                <a href={purchaseUrl} target="_blank" rel="noreferrer" className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white">
                                  {product.source}에서 열기
                                </a>
                                <a href={compareUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-4 py-2 text-center text-xs font-bold text-slate-700">
                                  네이버 가격 비교
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-500/60 bg-white/10 p-5 text-center text-sm font-bold leading-6 text-slate-300">
                  예산과 프롬프트 기준의 구매 후보를 준비했습니다. 분위기 참고 이미지를 생성한 뒤 별도 상품 리스트와 링크를 확인할 수 있습니다.
                </div>
              )}
            </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Score({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`rounded-2xl p-3 text-center text-xs font-black ${active ? "bg-white/15" : "bg-slate-50 text-slate-700"}`}>
      {label}<br />{value}점
    </div>
  );
}
