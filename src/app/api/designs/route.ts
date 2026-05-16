import { NextRequest, NextResponse } from "next/server";

import { createMockDesignJob, listDesignJobs } from "@/lib/design-job-repository";
import type { DesignGenerationRequest } from "@/lib/design-api";

const DEFAULT_BUDGET = 300000;
const MAX_BUDGET = 10000000;
const MAX_GENERATION = 30;

type DesignRequestBody = {
  budget?: unknown;
  prompt?: unknown;
  generation?: unknown;
  keptFurniture?: unknown;
  roomAnalysis?: unknown;
};

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function isRoomAnalysis(value: unknown): value is DesignGenerationRequest["roomAnalysis"] {
  return Boolean(value && typeof value === "object" && "id" in value && "recommendedPromptAdditions" in value);
}

function normalizeRequestBody(body: DesignRequestBody): DesignGenerationRequest {
  const budget = clampNumber(body.budget, DEFAULT_BUDGET, 10000, MAX_BUDGET);
  const generation = clampNumber(body.generation, 1, 1, MAX_GENERATION);
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 600) : "";
  const keptFurniture = Array.isArray(body.keptFurniture)
    ? body.keptFurniture.filter((item): item is string => typeof item === "string").slice(0, 10)
    : [];

  return {
    budget,
    prompt,
    generation,
    keptFurniture,
    roomAnalysis: isRoomAnalysis(body.roomAnalysis) ? body.roomAnalysis : null,
  };
}

export async function GET() {
  const jobs = listDesignJobs();

  return NextResponse.json({
    jobs,
    meta: {
      count: jobs.length,
      mode: "mock-product-composition",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as DesignRequestBody;
  const normalizedBody = normalizeRequestBody(body);
  const job = createMockDesignJob(normalizedBody);

  return NextResponse.json({
    job,
    concepts: job.concepts,
    history: job.history,
    meta: {
      jobId: job.id,
      createdAt: job.createdAt,
      budget: job.budget,
      generation: job.generation,
      keptFurniture: job.keptFurniture,
      promptLength: job.prompt.length,
      mode: job.mode,
      status: job.status,
      roomAnalysisId: job.roomAnalysis?.id,
    },
  });
}
