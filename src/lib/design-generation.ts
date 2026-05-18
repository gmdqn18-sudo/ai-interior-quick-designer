import { buildInteriorDesignPlan } from "./ai-interior-engine";
import type { DesignGenerationJob, DesignGenerationMode, DesignGenerationRequest, DesignGenerationStatus } from "./design-api";
import type { Product } from "./interior-design";
import type { ProductSearchMeta } from "./product-search";

export type ComposeDesignGenerationJobOptions = {
  id: string;
  createdAt: string;
  mode: DesignGenerationMode;
  status?: DesignGenerationStatus;
  productCandidates?: Product[];
  productSearchMeta?: ProductSearchMeta;
};

export function composeDesignGenerationJob(
  input: DesignGenerationRequest,
  { id, createdAt, mode, status = "completed", productCandidates, productSearchMeta }: ComposeDesignGenerationJobOptions,
): DesignGenerationJob {
  const plan = buildInteriorDesignPlan(input, { productCandidates });

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
    productSearchMeta,
    metrics: plan.metrics,
  };
}
