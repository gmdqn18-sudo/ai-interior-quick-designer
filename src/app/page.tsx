"use client";

import { ChangeEvent, useState } from "react";

import type { RenderAfterResponse } from "@/lib/after-image";
import type { DesignGenerationJob, DesignGenerationResponse, RoomAnalysis, RoomAnalysisResponse } from "@/lib/design-api";
import { buildDesignShareUrl, buildShoppingListShareText } from "@/lib/design-share";
import {
  buildConceptHistory,
  buildConcepts,
  budgetPresets,
  DesignConcept,
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

function buildShoppingListText(concept: DesignConcept, budget: number) {
  const productLines = concept.products
    .map((product, index) => `${index + 1}. ${product.name} / ${formatWon(product.price)} / ${product.source}\n   구매 링크: ${getProductPurchaseUrl(product)}`)
    .join("\n");

  return `[RoomFit AI] ${concept.title}\n설정 예산: ${formatWon(budget)}\n사용 금액: ${formatWon(
    concept.usedBudget,
  )}\n남은 예산: ${formatWon(budget - concept.usedBudget)}\n\n${productLines}`;
}

function buildClientFallbackJob({
  budget,
  prompt,
  generation,
  keptFurniture,
  roomAnalysis,
  concepts,
  history,
}: {
  budget: number;
  prompt: string;
  generation: number;
  keptFurniture: string[];
  roomAnalysis?: RoomAnalysis | null;
  concepts: DesignConcept[];
  history: DesignConcept[];
}): DesignGenerationJob {
  const usedBudgets = concepts.map((concept) => concept.usedBudget);

  return {
    id: `fallback_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "completed",
    mode: "browser-fallback",
    budget,
    prompt,
    generation,
    keptFurniture,
    roomAnalysis: roomAnalysis ?? null,
    concepts,
    history,
    metrics: {
      conceptCount: concepts.length,
      historyCount: history.length,
      averageBudgetFitScore: Math.round(
        concepts.reduce((sum, concept) => sum + concept.budgetFitScore, 0) / Math.max(concepts.length, 1),
      ),
      cheapestConceptUsedBudget: Math.min(...usedBudgets),
      highestConceptUsedBudget: Math.max(...usedBudgets),
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

export default function Home() {
  const [budget, setBudget] = useState(300000);
  const [prompt, setPrompt] = useState("30만 원 이하로 따뜻한 우드톤 자취방처럼 꾸며줘. 책상은 그대로 두고 수납을 늘리고 싶어.");
  const [keptFurniture, setKeptFurniture] = useState<string[]>(["책상"]);
  const [generation, setGeneration] = useState(1);
  const [concepts, setConcepts] = useState<DesignConcept[]>(() => buildConcepts(300000, prompt, 1));
  const [conceptHistory, setConceptHistory] = useState<DesignConcept[]>(() => buildConceptHistory(300000, prompt, 1));
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [roomImageDataUrl, setRoomImageDataUrl] = useState<string | null>(null);
  const [generatedAfterImages, setGeneratedAfterImages] = useState<Record<string, string>>({});
  const [afterImageNotice, setAfterImageNotice] = useState("AI 이미지는 스타일 참고용입니다. 실제 실행 기준은 아래 예산 맞춤 구매 플랜입니다.");
  const [isRenderingAfter, setIsRenderingAfter] = useState(false);
  const [copyStatus, setCopyStatus] = useState("쇼핑 리스트 복사");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  const [analysisNotice, setAnalysisNotice] = useState("사진을 올리면 mock Vision이 방의 톤·채광·수납 제약을 먼저 분석합니다.");
  const [apiNotice, setApiNotice] = useState("API Route가 실제 이케아 상품 상세 링크가 있는 카탈로그에서 예산 맞춤 조합을 반환합니다.");
  const [apiNoticeTone, setApiNoticeTone] = useState<"neutral" | "success" | "warning">("neutral");
  const [currentJob, setCurrentJob] = useState<DesignGenerationJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<DesignGenerationJob[]>([]);
  const [shareStatus, setShareStatus] = useState("공유 링크 복사");

  const selectedConcept =
    concepts.find((concept) => concept.id === selectedConceptId) ??
    conceptHistory.find((concept) => concept.id === selectedConceptId) ??
    concepts[0];
  const remainingBudget = budget - selectedConcept.usedBudget;
  const isPromptReady = prompt.trim().length >= 8;
  const isBudgetTight = selectedConcept.usedBudget > budget;
  const generatedAfterImage = generatedAfterImages[selectedConcept.id];
  const mustBuyProducts = selectedConcept.products.slice(0, Math.min(3, selectedConcept.products.length));
  const niceToHaveProducts = selectedConcept.products.slice(mustBuyProducts.length);
  const planCompletionPercent = Math.min(100, Math.round((selectedConcept.usedBudget / Math.max(budget, 1)) * 100));
  const keptFurnitureText = keptFurniture.length > 0 ? keptFurniture.join(" · ") : "큰 가구는 최대한 유지";

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

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setRoomImageDataUrl(null);
    setGeneratedAfterImages({});
    setAfterImageNotice("원본 방 사진을 AI 이미지 생성용으로 준비하는 중입니다...");
    setIsAnalyzing(true);
    setAnalysisNotice("방 사진을 mock Vision API로 분석하는 중입니다...");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setRoomImageDataUrl(dataUrl);
      setAfterImageNotice("방 사진 준비 완료. AI 이미지는 참고용으로 만들고, 실제 실행은 아래 구매 플랜 기준으로 제안합니다.");

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
      setRoomAnalysis(data.analysis);
      setAnalysisNotice(`분석 완료: ${data.analysis.summary}`);
    } catch {
      setRoomAnalysis(null);
      setAnalysisNotice("사진 분석 API 호출이 실패했습니다. 시안 생성은 텍스트 조건만으로 계속할 수 있습니다.");
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
    setCopyStatus("쇼핑 리스트 복사");
    setAfterImageNotice(roomImageDataUrl ? "새 시안이 생성되었습니다. AI 이미지는 참고용으로 생성하고, 실제 구매 판단은 아래 예산 플랜을 기준으로 보세요." : "AI 이미지는 스타일 참고용입니다. 실제 실행 기준은 아래 예산 맞춤 구매 플랜입니다.");

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
      setConcepts(data.concepts);
      setConceptHistory(data.history);
      setCurrentJob(data.job);
      setShareStatus("공유 링크 복사");
      setGeneration(nextGeneration);
      setApiNotice(
        `생성 Job ${data.meta.jobId} 완료 · ${data.meta.roomAnalysisId ? "방 분석 결과를 반영해 " : ""}실제 상품 카탈로그에서 예산·프롬프트·상품 점수를 다시 계산했습니다.`,
      );
      setApiNoticeTone("success");
      void refreshRecentJobs();
    } catch {
      const fallbackConcepts = buildConcepts(budget, prompt, nextGeneration);
      const fallbackHistory = buildConceptHistory(budget, prompt, nextGeneration);
      setConcepts(fallbackConcepts);
      setConceptHistory(fallbackHistory);
      setCurrentJob(
        buildClientFallbackJob({
          budget,
          prompt,
          generation: nextGeneration,
          keptFurniture,
          roomAnalysis,
          concepts: fallbackConcepts,
          history: fallbackHistory,
        }),
      );
      setShareStatus("공유 링크 복사");
      setGeneration(nextGeneration);
      setApiNotice("API 호출이 실패해 브라우저 내 실제 상품 카탈로그 조합으로 대체했습니다.");
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
      setAfterImageNotice("실제 AI After 이미지를 만들려면 먼저 방 사진을 업로드해 주세요.");
      return;
    }

    setIsRenderingAfter(true);
    setAfterImageNotice("OpenAI가 원본 방 사진의 촬영 각도/구도/방 구조를 고정한 채 After 이미지를 생성하는 중입니다. 보통 20~60초 정도 걸립니다.");

    try {
      const response = await fetch("/api/render-after", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: roomImageDataUrl,
          concept: selectedConcept,
          userPrompt: prompt,
          keptFurniture,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<RenderAfterResponse> & { error?: string };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error ?? "이미지 생성 API 호출이 실패했습니다.");
      }

      setGeneratedAfterImages((current) => ({ ...current, [selectedConcept.id]: data.imageUrl ?? "" }));
      setAfterImageNotice(`스타일 참고 이미지 생성 완료 · ${data.meta?.model ?? "OpenAI"} · 실제 구매 기준은 아래 플랜입니다.`);
    } catch (error) {
      setAfterImageNotice(error instanceof Error ? `이미지 생성 실패: ${error.message}` : "이미지 생성 실패: 알 수 없는 오류");
    } finally {
      setIsRenderingAfter(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
          <div className="font-bold tracking-tight">RoomFit AI</div>
          <a href="#demo" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/20">
            무료 데모 시작
          </a>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex rounded-full border border-amber-200 bg-white/70 px-4 py-2 text-sm font-semibold text-amber-800">
              일반 AI와 다른 점: 예산 고정 · 시안 비교 · 쇼핑 리스트 자동화
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
                내 방 사진 한 장으로,
                <br />예산 안에서 계속 뽑아보는 인테리어 시안
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                Gemini가 예쁜 이미지를 만들어준다면, RoomFit AI는 같은 예산 안에서 여러 시안을 비교하고 마음에 든 결과를 바로 구매 가능한 쇼핑 리스트로 바꿔줍니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["01", "프롬프트 고민 최소화"],
                ["02", "예산 내 실판매 상품 조합"],
                ["03", "시안 선택 후 구매 링크"],
              ].map(([number, label]) => (
                <div key={number} className="rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-black/5">
                  <div className="text-sm font-black text-amber-600">{number}</div>
                  <div className="mt-2 font-bold">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-4 text-white shadow-2xl shadow-slate-900/20">
            <div className={`h-72 rounded-[1.5rem] ${selectedConcept.palette} p-5 text-slate-950`}>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/35 p-5 backdrop-blur-sm">
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">AI After Preview</div>
                  <h2 className="text-2xl font-black">{selectedConcept.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-700">{selectedConcept.strategy}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="rounded-2xl bg-white/80 p-3">예산 적합도<br />{selectedConcept.budgetFitScore}점</div>
                  <div className="rounded-2xl bg-white/80 p-3">구현 난이도<br />쉬움</div>
                  <div className="rounded-2xl bg-white/80 p-3">사용 금액<br />{formatWon(selectedConcept.usedBudget)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="demo" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-amber-900/5 ring-1 ring-black/5 sm:p-6">
            <div className="mb-6">
              <p className="text-sm font-bold text-amber-700">STEP 1</p>
              <h2 className="mt-1 text-2xl font-black">방 사진, 예산, 취향만 입력하세요</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">상품명을 상상하지 않고, 실제 상품 상세 링크가 검증된 카탈로그 안에서 예산에 맞는 조합을 바꿔가며 시안을 만듭니다.</p>
            </div>

            <label className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-4 text-center transition hover:bg-amber-50">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="업로드한 방 사진 미리보기" className="h-48 w-full rounded-2xl bg-slate-900 object-contain" />
              ) : (
                <div>
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">＋</div>
                  <p className="font-bold">방 사진 업로드</p>
                  <p className="mt-1 text-sm text-slate-500">MVP에서는 브라우저 미리보기만 제공합니다</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
            </label>

            <div className={`mt-4 rounded-3xl p-4 text-sm ${roomAnalysis ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-600"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-black">AI 방 분석</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm">
                  {isAnalyzing ? "분석 중" : roomAnalysis ? "mock Vision 완료" : "대기"}
                </span>
              </div>
              <p className="mt-2 leading-6">{analysisNotice}</p>
              {roomAnalysis ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <div className="rounded-2xl bg-white p-3">공간<br />{roomAnalysis.roomType}</div>
                    <div className="rounded-2xl bg-white p-3">채광<br />{roomAnalysis.lightLevel}</div>
                    <div className="rounded-2xl bg-white p-3">생활감<br />{roomAnalysis.clutterLevel}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roomAnalysis.recommendedPromptAdditions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPrompt((current) => (current.includes(item) ? current : `${current} ${item}`))}
                        className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm"
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="prompt" className="text-sm font-bold">원하는 분위기/조건</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
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
                  {keepOptions.map((item) => (
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
                className="w-full rounded-3xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:hover:translate-y-0"
              >
                {isGenerating ? "AI가 예산 내 상품 조합을 다시 짜는 중..." : "같은 예산으로 시안 다시 뽑기"}
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

              {currentJob ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-500">생성 Job</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-900">{currentJob.id}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                      {currentJob.mode === "real-product-composition" ? "실제 상품 DB" : "Browser fallback"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-600">
                    <div className="rounded-2xl bg-white p-3">생성 시각<br />{formatJobTime(currentJob.createdAt)}</div>
                    <div className="rounded-2xl bg-white p-3">평균 적합도<br />{currentJob.metrics.averageBudgetFitScore}점</div>
                    <div className="rounded-2xl bg-white p-3">히스토리<br />{currentJob.metrics.historyCount}개</div>
                  </div>
                  {currentJob.roomAnalysis ? (
                    <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">
                      방 분석 반영: {currentJob.roomAnalysis.roomType} · 채광 {currentJob.roomAnalysis.lightLevel} · {currentJob.roomAnalysis.recommendedPromptAdditions.join(" / ")}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={copyJobShareLink}
                    className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white"
                  >
                    {shareStatus} · /designs/{currentJob.id}
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
                      <p className="text-xs font-black text-amber-700">최근 생성 결과</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">저장된 Job을 상세 페이지로 다시 열 수 있습니다.</p>
                    </div>
                    <button type="button" onClick={refreshRecentJobs} className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                      새로고침
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recentJobs.map((job) => (
                      <a key={job.id} href={`/designs/${job.id}`} className="block rounded-2xl bg-white px-3 py-3 text-xs font-bold text-slate-700 shadow-sm hover:text-slate-950">
                        <span className="font-mono text-slate-500">{job.id}</span>
                        <span className="mx-2 text-slate-300">·</span>
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

          <div className="space-y-6">
            <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-amber-900/5 ring-1 ring-black/5 sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-bold text-amber-700">STEP 2</p>
                  <h2 className="mt-1 text-2xl font-black">같은 예산의 시안을 비교하세요</h2>
                </div>
                <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">유지: {keptFurniture.join(", ") || "없음"}</div>
              </div>

              <div className="grid gap-3">
                {concepts.map((concept) => (
                  <button
                    key={concept.id}
                    type="button"
                    onClick={() => setSelectedConceptId(concept.id)}
                    className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selectedConcept.id === concept.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-lg font-black">{concept.title}</h3>
                        <p className={`mt-1 text-sm leading-6 ${selectedConcept.id === concept.id ? "text-slate-200" : "text-slate-600"}`}>{concept.strategy}</p>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-black">{formatWon(concept.usedBudget)}</div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Score label="예산" value={concept.budgetFitScore} active={selectedConcept.id === concept.id} />
                      <Score label="구매 가능" value={concept.feasibilityScore} active={selectedConcept.id === concept.id} />
                      <Score label="구조 유지" value={concept.roomStructureScore} active={selectedConcept.id === concept.id} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
                  <span>시안</span>
                  <span>총액</span>
                  <span>핵심</span>
                  <span>점수</span>
                </div>
                {concepts.map((concept) => (
                  <button
                    key={`table-${concept.id}`}
                    type="button"
                    onClick={() => setSelectedConceptId(concept.id)}
                    className="grid w-full grid-cols-4 items-center px-4 py-3 text-left text-xs font-semibold hover:bg-amber-50"
                  >
                    <span className="truncate pr-2">{concept.title}</span>
                    <span>{formatWon(concept.usedBudget)}</span>
                    <span>{concept.highlights[0]}</span>
                    <span>{concept.budgetFitScore}점</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-3xl bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-900">최근 생성 히스토리</div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {conceptHistory.map((concept) => (
                    <button
                      key={`history-${concept.id}`}
                      type="button"
                      onClick={() => setSelectedConceptId(concept.id)}
                      className="min-w-44 rounded-2xl bg-white p-3 text-left text-xs shadow-sm ring-1 ring-black/5"
                    >
                      <div className="font-black">{concept.title.replace(" 시안", "")}</div>
                      <div className="mt-1 text-slate-500">{formatWon(concept.usedBudget)} · {concept.budgetFitScore}점</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15 sm:p-6">
              <p className="text-sm font-bold text-amber-300">STEP 3</p>
              <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-2xl font-black">예산 안에서 이 방 완성하기</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    AI 이미지는 스타일 참고용으로 쓰고, 실제 판단 기준은 아래 예산·우선순위·구매 리스트입니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyShoppingList}
                  className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950"
                >
                  {copyStatus}
                </button>
              </div>

              <div className="mt-5 grid gap-2 text-center text-sm font-bold sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-3">설정 예산<br />{formatWon(budget)}</div>
                <div className="rounded-2xl bg-white/10 p-3">사용 금액<br />{formatWon(selectedConcept.usedBudget)}</div>
                <div className="rounded-2xl bg-white/10 p-3">남은 예산<br />{formatWon(remainingBudget)}</div>
                <div className="rounded-2xl bg-amber-300 p-3 text-slate-950">예산 활용<br />{planCompletionPercent}%</div>
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
                  <p className="mt-1 text-xs leading-5 text-slate-400">구매 리스트에 있는 품목만 중심으로 분위기를 바꿉니다.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <div className="text-xs font-black text-amber-200">실행 기준</div>
                  <p className="mt-2 text-sm font-bold leading-6 text-white">먼저 살 핵심 {mustBuyProducts.length}개 + 선택 {niceToHaveProducts.length}개</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">예쁜 이미지보다 실패 없는 구매 순서를 우선합니다.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl bg-white/10 p-3">
                  <div className="mb-2 text-xs font-black text-slate-300">현재 방</div>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="원본 방 사진" className="h-40 w-full rounded-2xl bg-slate-900 object-contain" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-800 text-sm text-slate-400">업로드한 방 사진 영역</div>
                  )}
                </div>
                <div className="rounded-3xl bg-white/10 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs font-black text-slate-300">
                    <span>{generatedAfterImage ? "스타일 참고 이미지" : "시안 스타일 참고"} · {selectedConcept.title}</span>
                    <span>{selectedConcept.products.length}개 상품</span>
                  </div>
                  {generatedAfterImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={generatedAfterImage} alt={`${selectedConcept.title} 실제 AI After 이미지`} className="h-44 w-full rounded-2xl bg-slate-900 object-contain" />
                  ) : (
                    <div className={`relative flex h-44 overflow-hidden rounded-2xl ${selectedConcept.palette} p-4 text-slate-950`}>
                      <div className="absolute left-5 top-5 h-16 w-24 rounded-2xl bg-white/55 shadow-sm" />
                      <div className="absolute right-5 top-8 h-24 w-16 rounded-2xl bg-white/45 shadow-sm" />
                      <div className="absolute bottom-4 left-1/2 h-12 w-32 -translate-x-1/2 rounded-[999px] bg-white/45 shadow-sm" />
                      <div className="relative z-10 mt-auto w-full rounded-2xl bg-white/85 p-3 text-xs font-black shadow-sm backdrop-blur">
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
                  <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-bold leading-5 text-slate-300">
                    {afterImageNotice}
                  </div>
                  <button
                    type="button"
                    onClick={renderAfterImage}
                    disabled={isRenderingAfter || !roomImageDataUrl}
                    className="mt-3 w-full rounded-2xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:translate-y-0"
                  >
                    {isRenderingAfter ? "OpenAI 이미지 생성 중..." : generatedAfterImage ? "스타일 참고 이미지 다시 생성" : "스타일 참고 이미지 생성"}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-amber-300/40 bg-amber-300/10 p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-black text-amber-200">이 시안에 실제로 활용한 제품</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      아래 상품은 실제 이케아 상품 상세 페이지가 확인된 구매 후보입니다. 각 버튼은 검색 결과가 아니라 해당 상품 상세 페이지로 바로 연결됩니다.
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">총 {selectedConcept.products.length}개 · {formatWon(selectedConcept.usedBudget)}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedConcept.products.map((product, index) => (
                    <a
                      key={`used-${product.id}`}
                      href={getProductPurchaseUrl(product)}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl bg-white p-3 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">{index + 1}</span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black">{product.name}</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500">{product.source} 바로 열기 · {formatWon(product.price)}</div>
                          <div className="mt-1 text-[11px] font-semibold text-amber-700 group-hover:underline">{getProductPlacement(product)}</div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-amber-200">먼저 살 핵심 아이템</h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">분위기 변화 우선</span>
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
                              <div className="text-xs font-bold text-amber-700">{index + 1}순위 · {product.category} · {product.source} 연동</div>
                              <h3 className="mt-1 font-black">{product.name}</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{product.reason}</p>
                              <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                배치 위치: {placement}
                              </p>
                              <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                역할: {selectedConcept.highlights[index] ?? "선택한 시안의 핵심 분위기 구현"}
                              </p>
                              {substitute ? (
                                <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                  저가 대체안: {substitute.name} · {formatWon(substitute.price)}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                              <span className="font-black">{formatWon(product.price)}</span>
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
                                <div className="text-xs font-bold text-slate-500">선택 {index + 1} · {product.category} · {product.source} 연동</div>
                                <h3 className="mt-1 font-black">{product.name}</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{product.reason}</p>
                                <p className="mt-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                                  배치 위치: {placement}
                                </p>
                                {substitute ? (
                                  <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                    저가 대체안: {substitute.name} · {formatWon(substitute.price)}
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                <span className="font-black">{formatWon(product.price)}</span>
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
            </div>
          </div>
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
