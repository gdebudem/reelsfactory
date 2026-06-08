import { z } from "zod";

export const REEL_TYPES = [
  { id: "promo", label: "Акция" },
  { id: "new", label: "Новинка" },
  { id: "features", label: "Преимущества" },
  { id: "problem_solution", label: "Проблема → решение" },
  { id: "seasonal", label: "Сезонное" },
] as const;

export const HIGHLIGHT_CHIPS = [
  "суперцена",
  "компактность",
  "надёжность",
  "качество",
  "быстрая доставка",
  "гарантия",
] as const;

export const CTA_TYPES = [
  { id: "website", label: "Сайт" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "store", label: "Магазин / маркетплейс" },
] as const;

export const JOB_STATUSES = [
  "draft",
  "paid",
  "queued",
  "researching",
  "scripting",
  "generating_images",
  "image_generating",
  "images_ready",
  "storyboard_ready", // legacy alias for images_ready
  "render_queued",
  "rendering",
  "ready",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const TIERS = ["basic", "premium"] as const;

export const productSpecSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const productReviewSchema = z.object({
  text: z.string(),
  rating: z.number().min(0).max(5).optional(),
  author: z.string().optional(),
});

export const aggregateRatingSchema = z.object({
  value: z.number().min(0).max(5),
  count: z.number().int().nonnegative().optional(),
});

export type ProductSpec = z.infer<typeof productSpecSchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type AggregateRating = z.infer<typeof aggregateRatingSchema>;

export const productCardSchema = z.object({
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string().default("RUB"),
  images: z.array(z.string().url()),
  description: z.string().optional(),
  sourceUrl: z.string().url(),
  brand: z.string().optional(),
  category: z.string().optional(),
  specs: z.array(productSpecSchema).optional(),
  reviews: z.array(productReviewSchema).optional(),
  prosFromPage: z.array(z.string()).optional(),
  aggregateRating: aggregateRatingSchema.optional(),
});

export type ProductCard = z.infer<typeof productCardSchema>;

export const externalSnippetSchema = z.object({
  source: z.string(),
  url: z.string().url(),
  quote: z.string(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
});

export const marketplaceReviewSchema = z.object({
  platform: z.string(),
  rating: z.number().min(0).max(5).optional(),
  quote: z.string(),
});

export const marketplaceListingSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  price: z.number().nullable().optional(),
  currency: z.string().optional(),
});

export const productIntelSchema = z.object({
  productTitle: z.string(),
  brand: z.string().optional(),
  category: z.string().optional(),
  specsFromPage: z.array(productSpecSchema).optional(),
  reviewsFromPage: z.array(productReviewSchema).optional(),
  externalSnippets: z.array(externalSnippetSchema).optional(),
  marketplaceReviews: z.array(marketplaceReviewSchema).optional(),
  marketplaceListings: z.array(marketplaceListingSchema).optional(),
  consumerPainPoints: z.array(z.string()).optional(),
  rankedSellingPoints: z.array(z.string()).optional(),
  socialProof: z.string().optional(),
  researchSources: z.array(z.string()).optional(),
});

export type ExternalSnippet = z.infer<typeof externalSnippetSchema>;
export type MarketplaceReview = z.infer<typeof marketplaceReviewSchema>;
export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
export type ProductIntel = z.infer<typeof productIntelSchema>;

export const reelTypeSchema = z.enum([
  "promo",
  "new",
  "features",
  "problem_solution",
  "seasonal",
]);

export const ctaTypeSchema = z.enum(["website", "whatsapp", "store"]);

export const tierSchema = z.enum(["basic", "premium"]);

export const wizardStep1Schema = z.object({
  productUrl: z.string().url("Введите корректную ссылку"),
  product: productCardSchema.optional(),
});

export const wizardStep2Schema = z.object({
  reelType: reelTypeSchema,
});

export const wizardStep3Schema = z.object({
  highlights: z.array(z.string()).min(1, "Выберите хотя бы один акцент"),
  customHighlight: z.string().optional(),
});

export const wizardStep4Schema = z.object({
  ctaType: ctaTypeSchema,
  ctaValue: z.string().optional(),
});

export const wizardFormSchema = z.object({
  productUrl: z.string().url(),
  product: productCardSchema,
  reelType: reelTypeSchema,
  highlights: z.array(z.string()).min(1),
  customHighlight: z.string().optional(),
  ctaType: ctaTypeSchema,
  ctaValue: z.string().optional(),
  tier: tierSchema.default("basic"),
});

export type WizardForm = z.infer<typeof wizardFormSchema>;

export const sceneStyleSchema = z.enum([
  "headline",
  "subheadline",
  "bullet",
  "review",
  "cta",
  "hook",
  "pain",
  "proof",
]);

export const sceneSchema = z.object({
  startSec: z.number(),
  endSec: z.number(),
  text: z.string(),
  style: sceneStyleSchema.optional(),
  imageIndex: z.number().int().min(0).max(4).optional(),
  emphasis: z.string().optional(),
});

export const musicMoodSchema = z.enum(["energetic", "trust", "premium"]);

export const reelScriptSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  priceLabel: z.string().optional(),
  ctaText: z.string(),
  bullets: z.array(z.string()).optional(),
  reviewQuote: z.string().optional(),
  scenes: z.array(sceneSchema),
  templateId: z
    .enum(["promo", "features", "viral_v1"])
    .default("viral_v1"),
  musicTrackId: z.string().optional(),
  musicMood: musicMoodSchema.optional(),
});

export type ReelScript = z.infer<typeof reelScriptSchema>;

export const parseProductRequestSchema = z.object({
  url: z.string().url(),
});

export const createReelJobSchema = wizardFormSchema;

export const generateScriptRequestSchema = z.object({
  jobId: z.string().cuid().optional(),
  product: productCardSchema,
  reelType: reelTypeSchema,
  highlights: z.array(z.string()),
  customHighlight: z.string().optional(),
  ctaType: ctaTypeSchema,
  ctaValue: z.string().optional(),
  tier: tierSchema.default("basic"),
});

export const PRICING = {
  basic: { amount: 99, label: "$0.99", display: "0,99 $" },
  premium: { amount: 199, label: "$1.99", display: "1,99 $" },
} as const;

export {
  PIPELINE_VERSION,
  isViralScript,
  shouldRegenerateScript,
} from "./pipeline";

export {
  PIPELINE_STEP_IDS,
  PIPELINE_STEP_LABELS,
  pipelineProgressSchema,
  sceneImageSchema,
  sceneImagesSchema,
  createInitialProgress,
  setPipelineActiveStep,
  markPipelineStep,
  isApprovalReadyStatus,
  isPreviewReadyStatus,
  resolvePipelineStepState,
  type PipelineStepId,
  type PipelineProgress,
  type PipelineStepState,
  type SceneImage,
} from "./pipeline-progress";
