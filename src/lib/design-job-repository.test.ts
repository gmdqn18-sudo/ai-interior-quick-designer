import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { DesignGenerationJob } from "./design-api";
import { createRealDesignJob, getDesignJob } from "./design-job-repository";

const globalStore = globalThis as typeof globalThis & {
  __roomfitDesignJobs?: Map<string, DesignGenerationJob>;
};

test("getDesignJob can restore a job after the in-memory cache is cleared", () => {
  const job = createRealDesignJob({
    budget: 120000,
    prompt: "수납 중심 원룸",
    generation: 1,
    keptFurniture: ["책상"],
    roomAnalysis: null,
  });

  globalStore.__roomfitDesignJobs?.clear();

  const restored = getDesignJob(job.id);

  assert.equal(restored?.id, job.id);
  assert.equal(restored?.concepts.length, job.concepts.length);
});
