import type { DesignConcept } from "./interior-design";

export type DesignGenerationStatus = "queued" | "completed" | "failed";

export type DesignGenerationMode = "real-product-composition" | "browser-fallback";

export type RoomAnalysis = {
  id: string;
  createdAt: string;
  source: "mock-vision";
  file: {
    name: string;
    type: string;
    size: number;
  };
  summary: string;
  roomType: "원룸" | "침실" | "거실" | "작업방";
  lightLevel: "낮음" | "보통" | "좋음";
  clutterLevel: "낮음" | "보통" | "높음";
  dominantTones: string[];
  detectedFurniture: string[];
  constraints: string[];
  opportunities: string[];
  recommendedPromptAdditions: string[];
  confidenceScore: number;
};

export type RoomAnalysisResponse = {
  analysis: RoomAnalysis;
  meta: {
    analysisId: string;
    mode: "mock-vision";
  };
};

export type DesignGenerationRequest = {
  budget: number;
  prompt: string;
  generation: number;
  keptFurniture: string[];
  roomAnalysis?: RoomAnalysis | null;
};

export type DesignGenerationJob = DesignGenerationRequest & {
  id: string;
  createdAt: string;
  status: DesignGenerationStatus;
  mode: DesignGenerationMode;
  concepts: DesignConcept[];
  history: DesignConcept[];
  metrics: {
    conceptCount: number;
    historyCount: number;
    averageBudgetFitScore: number;
    cheapestConceptUsedBudget: number;
    highestConceptUsedBudget: number;
  };
};

export type DesignGenerationResponse = {
  job: DesignGenerationJob;
  concepts: DesignConcept[];
  history: DesignConcept[];
  meta: {
    jobId: string;
    createdAt: string;
    budget: number;
    generation: number;
    keptFurniture: string[];
    promptLength: number;
    mode: DesignGenerationMode;
    status: DesignGenerationStatus;
    roomAnalysisId?: string;
  };
};

export type DesignJobsListResponse = {
  jobs: DesignGenerationJob[];
  meta: {
    count: number;
    mode: DesignGenerationMode;
  };
};
