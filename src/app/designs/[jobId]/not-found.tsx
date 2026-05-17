import Link from "next/link";

export default function DesignNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 text-[#222222]">
      <section className="w-full max-w-xl rounded-[2.5rem] border border-black/5 bg-white p-8 text-center shadow-[var(--commercial-shadow)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-2xl font-black text-[#ff385c]">?</div>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.04em]">공유 시안을 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          공유 결과가 만료되었거나 잘못된 링크일 수 있습니다. 새 방 사진과 조건으로 다시 시안을 생성해 주세요.
        </p>
        <Link href="/#demo" className="mt-6 inline-flex rounded-full bg-[#ff385c] px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 hover:bg-[#e00b41]">
          새 시안 만들기
        </Link>
      </section>
    </main>
  );
}
