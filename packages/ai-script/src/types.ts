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
