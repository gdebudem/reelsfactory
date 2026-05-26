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
  "rendering",
  "ready",
  "failed",
] as const;

export const TIERS = ["basic", "premium"] as const;

export const productCardSchema = z.object({
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string().default("RUB"),
  images: z.array(z.string().url()),
  description: z.string().optional(),
  sourceUrl: z.string().url(),
});

export type ProductCard = z.infer<typeof productCardSchema>;

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

export const sceneSchema = z.object({
  startSec: z.number(),
  endSec: z.number(),
  text: z.string(),
  style: z.enum(["headline", "subheadline", "bullet", "cta"]).optional(),
});

export const reelScriptSchema = z.object({
  headline: z.string(),
  subheadline: z.string(),
  priceLabel: z.string().optional(),
  ctaText: z.string(),
  bullets: z.array(z.string()).optional(),
  scenes: z.array(sceneSchema),
  templateId: z.enum(["promo", "features"]).default("promo"),
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
