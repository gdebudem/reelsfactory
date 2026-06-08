import type { PipelineStepId } from "@reels-factory/shared";

export type ResearchProgressReporter = {
  start: (stepId: PipelineStepId) => void | Promise<void>;
  complete: (stepId: PipelineStepId) => void | Promise<void>;
  log: (text: string) => void | Promise<void>;
};

export const noopReporter: ResearchProgressReporter = {
  start: () => undefined,
  complete: () => undefined,
  log: () => undefined,
};
