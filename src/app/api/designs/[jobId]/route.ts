import { NextResponse } from "next/server";

import { getDesignJob } from "@/lib/design-job-repository";

export async function GET(_request: Request, context: RouteContext<"/api/designs/[jobId]">) {
  const { jobId } = await context.params;
  const job = getDesignJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "생성 Job을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    job,
    concepts: job.concepts,
    history: job.history,
    meta: {
      jobId: job.id,
      createdAt: job.createdAt,
      status: job.status,
      mode: job.mode,
      roomAnalysisId: job.roomAnalysis?.id,
    },
  });
}
