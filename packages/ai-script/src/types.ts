import type {
  ProductCard,
  ProductIntel,
  reelTypeSchema,
  ctaTypeSchema,
  tierSchema,
} from "@reels-factory/shared";
import type { z } from "zod";

export type GenerateScriptInput = {
  product: ProductCard;
  productIntel?: ProductIntel;
  reelType: z.infer<typeof reelTypeSchema>;
  highlights: string[];
  customHighlight?: string;
  ctaType: z.infer<typeof ctaTypeSchema>;
  ctaValue?: string;
  tier?: z.infer<typeof tierSchema>;
};

export type GenerateScriptUsage = {
  label: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type GenerateScriptResult = {
  script: import("@reels-factory/shared").ReelScript;
  usage?: GenerateScriptUsage;
  mock?: boolean;
  mockReason?: string;
  billingExceeded?: boolean;
};
