import Link from "next/link";

export default function DesignNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f1e8] px-5 text-slate-950">
      <section className="w-full max-w-xl rounded-[2.5rem] bg-white p-8 text-center shadow-xl shadow-amber-900/5 ring-1 ring-black/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-2xl font-black text-amber-800">?</div>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.04em]">공유 시안을 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          로컬 MVP 저장소에 없는 Job이거나, 개발 서버를 다시 시작하면서 캐시가 초기화된 결과일 수 있습니다.
          새 방 사진/조건으로 다시 시안을 생성해 주세요.
        </p>
        <Link href="/#demo" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
          새 시안 만들기
        </Link>
      </section>
    </main>
  );
}
