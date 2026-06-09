import { PrismaClient } from "@prisma/client";
import {
  normalizePromptOverrides,
  type PromptOverrides,
} from "@reels-factory/shared";

const SETTINGS_ID = "default";

export async function loadPromptOverrides(
  prisma: PrismaClient
): Promise<PromptOverrides> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { promptsJson: true },
    });
    return normalizePromptOverrides(row?.promptsJson);
  } catch {
    return {};
  }
}
