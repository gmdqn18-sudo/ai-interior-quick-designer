import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDesignJob } from "@/lib/design-job-repository";
import {
  buildDesignShareSummary,
  buildDesignShareUrl,
  buildShoppingListShareText,
  formatWon,
  getTopValueProducts,
} from "@/lib/design-share";

export const dynamic = "force-dynamic";

type DesignDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({ params }: DesignDetailPageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = getDesignJob(jobId);

  if (!job) {
    return {
      title: "공유 시안을 찾을 수 없습니다 | RoomFit AI",
    };
  }

  const summary = buildDesignShareSummary(job);
  return {
    title: `${summary.heroTitle} | RoomFit AI`,
    description: `${summary.budgetLabel} 예산으로 구성한 ${summary.productCount}개 상품 인테리어 시안입니다. ${summary.roomAnalysisLabel}`,
  };
}

export default async function DesignDetailPage({ params }: DesignDetailPageProps) {
  const { jobId } = await params;
  const job = getDesignJob(jobId);

  if (!job) {
    notFound();
  }

  const summary = buildDesignShareSummary(job);
  const heroConcept = job.concepts[0];
  const sharePath = buildDesignShareUrl("", job.id);
  const copyText = buildShoppingListShareText(job, sharePath);
  const topValueProducts = getTopValueProducts(job, 3);

  return (
    <main className="min-h-screen overflow-hidden text-[#222222]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <nav className="sticky top-4 z-50 flex flex-col gap-3 rounded-[2rem] border border-black/5 bg-white/85 px-5 py-4 shadow-[var(--commercial-shadow)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#ff385c] text-white shadow-lg shadow-rose-500/25">R</span>
              <span>RoomFit AI</span>
            </Link>
            <p className="mt-1 text-xs font-bold text-slate-500">공유된 인테리어 시안 · {job.id}</p>
          </div>
          <Link href="/#demo" className="rounded-full bg-[#ff385c] px-5 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#e00b41]">
            내 방도 다시 만들기
          </Link>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-[var(--commercial-shadow)] sm:p-8">
            <div className="inline-flex rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-[#ff385c]">
              {job.mode === "real-product-composition" ? "실제 상품 카탈로그 기반 결과" : "브라우저 대체 생성 결과"}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">{summary.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">{summary.heroStrategy}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <Metric label="설정 예산" value={summary.budgetLabel} />
              <Metric label="사용 금액" value={summary.usedBudgetLabel} />
              <Metric label="남은 예산" value={summary.remainingBudgetLabel} />
              <Metric label="예산 활용" value={`${summary.budgetUsageRate}%`} />
            </div>

            <div className="mt-5 rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-black">방 분석 요약</p>
              <p className="mt-2 leading-6">{summary.roomAnalysisLabel}</p>
              {job.roomAnalysis ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.roomAnalysis.recommendedPromptAdditions.map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-700">실행 체크리스트</p>
              <ol className="mt-3 space-y-2 text-sm font-bold text-slate-600">
                {summary.executionChecklist.map((item, index) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-amber-700">{index + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-black/5 bg-white p-3 shadow-[var(--commercial-shadow)]">
            <div className={`relative flex min-h-80 flex-col justify-between overflow-hidden rounded-[2rem] ${heroConcept.palette} p-5 text-slate-950`}>
              <div className="absolute left-8 top-24 h-20 w-32 rounded-3xl bg-white/45 shadow-sm" />
              <div className="absolute right-8 top-28 h-32 w-20 rounded-3xl bg-white/35 shadow-sm" />
              <div className="absolute bottom-12 left-1/2 h-16 w-44 -translate-x-1/2 rounded-[999px] bg-white/45 shadow-sm" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="rounded-3xl bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs font-black text-[#ff385c]">AI 시안 미리보기</p>
                  <h2 className="mt-1 max-w-xs text-2xl font-black">{heroConcept.title}</h2>
                </div>
                <div className="rounded-full bg-white/90 px-3 py-2 text-xs font-black shadow-sm">{summary.productCount}개 상품</div>
              </div>
              <div className="relative z-10 grid gap-3 sm:grid-cols-3">
                {summary.topHighlights.map((highlight) => (
                  <div key={highlight} className="rounded-2xl bg-white/80 p-3 text-xs font-black shadow-sm">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-[var(--commercial-shadow)] sm:p-6">
            <p className="text-sm font-black text-[#ff385c]">시안 비교</p>
            <h2 className="mt-1 text-2xl font-black">같은 예산의 후보들</h2>
            <div className="mt-5 space-y-3">
              {job.concepts.map((concept) => (
                <div key={concept.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{concept.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{concept.strategy}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{formatWon(concept.usedBudget)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-600">
                    <Metric label="예산" value={`${concept.budgetFitScore}점`} compact />
                    <Metric label="구매" value={`${concept.feasibilityScore}점`} compact />
                    <Metric label="구조" value={`${concept.roomStructureScore}점`} compact />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">가성비 우선 확인 상품</p>
              <div className="mt-3 space-y-2">
                {topValueProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                    <span>{product.name}</span>
                    <span>{formatWon(product.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-[#222222] p-5 text-white shadow-[var(--commercial-shadow)] sm:p-6">
            <p className="text-sm font-black text-rose-300">쇼핑 리스트</p>
            <h2 className="mt-1 text-2xl font-black">대표 시안 구매 후보</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">카테고리: {summary.productCategories.join(" · ") || "미정"}</p>
            <textarea readOnly value={copyText} className="sr-only" aria-label="공유용 쇼핑 리스트 텍스트" />
            <div className="mt-5 space-y-3">
              {heroConcept.products.map((product) => (
                <div key={product.id} className="rounded-3xl bg-white p-4 text-slate-950">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-xs font-bold text-amber-700">{product.category} · {product.source}</div>
                      <h3 className="mt-1 font-black">{product.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{product.reason}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-black">{formatWon(product.price)}</span>
                      <a href={product.url} target="_blank" rel="noreferrer" className="rounded-full bg-[#ff385c] px-4 py-2 text-sm font-black text-white transition hover:bg-[#e00b41]">
                        보기
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-3 text-center font-black text-slate-800 ${compact ? "text-xs" : "text-sm shadow-sm ring-1 ring-black/5"}`}>
      <span className="block text-slate-500">{label}</span>
      <span className="mt-1 block">{value}</span>
    </div>
  );
}
