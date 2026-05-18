import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { composeDesignGenerationJob } from "./design-generation";
import type { DesignGenerationJob, DesignGenerationRequest } from "./design-api";
import type { Product } from "./interior-design";
import type { ProductSearchMeta } from "./product-search";

const MAX_STORED_JOBS = 20;
const STORE_PATH = join(process.cwd(), ".next", "cache", "roomfit-design-jobs.json");

const globalStore = globalThis as typeof globalThis & {
  __roomfitDesignJobs?: Map<string, DesignGenerationJob>;
};

const jobs = globalStore.__roomfitDesignJobs ?? new Map<string, DesignGenerationJob>();
globalStore.__roomfitDesignJobs = jobs;

function makeJobId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `job_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadPersistedJobs() {
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, DesignGenerationJob>;
    for (const [id, job] of Object.entries(parsed)) {
      jobs.set(id, job);
    }
  } catch {
    // The MVP store is best-effort. Missing or malformed cache files should not block generation.
  }
}

function savePersistedJobs() {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(Object.fromEntries(jobs), null, 2));
  } catch {
    // Keep API responses fast even if the local cache cannot be written.
  }
}

function pruneJobs() {
  const ids = Array.from(jobs.keys());
  while (ids.length > MAX_STORED_JOBS) {
    const oldestId = ids.shift();
    if (oldestId) jobs.delete(oldestId);
  }
}

export type CreateDesignJobOptions = {
  productCandidates?: Product[];
  productSearchMeta?: ProductSearchMeta;
};

export function createRealDesignJob(input: DesignGenerationRequest, options: CreateDesignJobOptions = {}): DesignGenerationJob {
  const job = composeDesignGenerationJob(input, {
    id: makeJobId(),
    createdAt: new Date().toISOString(),
    mode: "real-product-composition",
    productCandidates: options.productCandidates,
    productSearchMeta: options.productSearchMeta,
  });

  jobs.set(job.id, job);
  pruneJobs();
  savePersistedJobs();
  return job;
}

export function listDesignJobs() {
  loadPersistedJobs();
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDesignJob(jobId: string) {
  loadPersistedJobs();
  return jobs.get(jobId) ?? null;
}
