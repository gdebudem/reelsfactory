import { z } from "zod";

const sceneStyleSchema = z.enum([
  "headline",
  "subheadline",
  "bullet",
  "review",
  "cta",
  "hook",
  "pain",
  "proof",
]);

export const PIPELINE_STEP_IDS = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
  "write_script",
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
  "assemble_video",
] as const;

export type PipelineStepId = (typeof PIPELINE_STEP_IDS)[number];

const PRE_RENDER_STEPS: PipelineStepId[] = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
  "write_script",
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
];

export const PIPELINE_STEP_LABELS: Record<PipelineStepId, string> = {
  search_marketplaces: "Ищем страницы товара на маркетплейсах",
  search_ozon: "Ищем на Ozon",
  search_wildberries: "Ищем на Wildberries",
  search_mvideo: "Ищем в М.Видео",
  read_descriptions: "Читаем описание",
  read_reviews: "Читаем отзывы",
  extract_benefits: "Выделяем преимущества",
  write_script: "Пишем сценарий",
  generate_image_1: "Генерируем картинку 1/4",
  generate_image_2: "Генерируем картинку 2/4",
  generate_image_3: "Генерируем картинку 3/4",
  generate_image_4: "Генерируем картинку 4/4",
  assemble_video: "Собираем видео",
};

export const pipelineProgressSchema = z.object({
  currentStep: z.enum(PIPELINE_STEP_IDS).optional(),
  completedSteps: z.array(z.enum(PIPELINE_STEP_IDS)).default([]),
  imageProgress: z.number().int().min(0).max(4).default(0),
  updatedAt: z.string().optional(),
});

export type PipelineProgress = z.infer<typeof pipelineProgressSchema>;

export const sceneImageSchema = z.object({
  sceneIndex: z.number().int().min(0).max(3),
  style: sceneStyleSchema.optional(),
  text: z.string(),
  imageUrl: z.string().url(),
  prompt: z.string().optional(),
});

export type SceneImage = z.infer<typeof sceneImageSchema>;

export const sceneImagesSchema = z.array(sceneImageSchema).max(4);

export function createInitialProgress(): PipelineProgress {
  return pipelineProgressSchema.parse({
    completedSteps: [],
    imageProgress: 0,
    updatedAt: new Date().toISOString(),
  });
}

export function setPipelineActiveStep(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  return pipelineProgressSchema.parse({
    ...progress,
    currentStep: stepId,
    updatedAt: new Date().toISOString(),
  });
}

export function markPipelineStep(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  const completed = progress.completedSteps.includes(stepId)
    ? progress.completedSteps
    : [...progress.completedSteps, stepId];

  const imageProgress =
    stepId === "generate_image_1"
      ? 1
      : stepId === "generate_image_2"
        ? 2
        : stepId === "generate_image_3"
          ? 3
          : stepId === "generate_image_4"
            ? 4
            : progress.imageProgress;

  return pipelineProgressSchema.parse({
    currentStep: undefined,
    completedSteps: completed,
    imageProgress,
    updatedAt: new Date().toISOString(),
  });
}

/** User can approve video render after storyboard or AI images are ready. */
export function isApprovalReadyStatus(status: string): boolean {
  return status === "images_ready" || status === "storyboard_ready";
}

/** Pipeline finished research/script/images prep (waiting for user or render). */
export function isPreviewReadyStatus(status: string): boolean {
  return isApprovalReadyStatus(status);
}

export type PipelineStepState = "pending" | "active" | "done";

const RESEARCH_STEPS: PipelineStepId[] = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
];
const IMAGE_STEPS: PipelineStepId[] = [
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
];

function statusDefaultActiveStep(status: string): PipelineStepId | null {
  if (status === "paid" || status === "queued") return "search_marketplaces";
  if (status === "researching") return "search_marketplaces";
  if (status === "scripting") return "write_script";
  if (status === "generating_images" || status === "image_generating") {
    return "generate_image_1";
  }
  if (status === "render_queued" || status === "rendering") {
    return "assemble_video";
  }
  return null;
}

function statusDefaultCompleted(status: string): PipelineStepId[] {
  if (status === "scripting") return [...RESEARCH_STEPS];
  if (status === "generating_images" || status === "image_generating") {
    return [...RESEARCH_STEPS, "write_script"];
  }
  if (isPreviewReadyStatus(status)) return [...PRE_RENDER_STEPS];
  if (status === "render_queued" || status === "rendering") {
    return [...PRE_RENDER_STEPS];
  }
  if (status === "ready") return [...PIPELINE_STEP_IDS];
  return [];
}

export function resolvePipelineStepState(
  stepId: PipelineStepId,
  progress: PipelineProgress | null | undefined,
  jobStatus: string
): PipelineStepState {
  const completed = new Set([
    ...statusDefaultCompleted(jobStatus),
    ...(progress?.completedSteps ?? []),
  ]);

  if (completed.has(stepId)) return "done";

  const active =
    progress?.currentStep ??
    statusDefaultActiveStep(jobStatus);

  if (active === stepId) return "active";

  if (
    (jobStatus === "generating_images" || jobStatus === "image_generating") &&
    IMAGE_STEPS.includes(stepId) &&
    (progress?.imageProgress ?? 0) > 0
  ) {
    const idx = IMAGE_STEPS.indexOf(stepId);
    const doneCount = progress?.imageProgress ?? 0;
    if (idx < doneCount) return "done";
    if (idx === doneCount) return "active";
  }

  if (
    jobStatus === "researching" &&
    RESEARCH_STEPS.includes(stepId) &&
    !progress?.currentStep
  ) {
    const firstPending = RESEARCH_STEPS.find((s) => !completed.has(s));
    if (stepId === firstPending) return "active";
  }

  return "pending";
}
