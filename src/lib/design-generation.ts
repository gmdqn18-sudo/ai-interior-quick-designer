import { buildInteriorDesignPlan } from "./ai-interior-engine";
import type { DesignGenerationJob, DesignGenerationMode, DesignGenerationRequest, DesignGenerationStatus } from "./design-api";

export type ComposeDesignGenerationJobOptions = {
  id: string;
  createdAt: string;
  mode: DesignGenerationMode;
  status?: DesignGenerationStatus;
};

export function composeDesignGenerationJob(
  input: DesignGenerationRequest,
  { id, createdAt, mode, status = "completed" }: ComposeDesignGenerationJobOptions,
): DesignGenerationJob {
  const plan = buildInteriorDesignPlan(input);

  return {
    id,
    createdAt,
    status,
    mode,
    budget: input.budget,
    prompt: input.prompt,
    generation: input.generation,
    keptFurniture: input.keptFurniture,
    roomAnalysis: input.roomAnalysis ?? null,
    concepts: plan.concepts,
    history: plan.history,
    metrics: plan.metrics,
  };
}
