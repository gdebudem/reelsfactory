import {
  normalizePromptOverrides,
  type PromptOverrides,
} from "@reels-factory/shared";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";

export async function loadPromptOverrides(): Promise<PromptOverrides> {
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

export async function savePromptOverrides(
  overrides: PromptOverrides
): Promise<PromptOverrides> {
  const cleaned = normalizePromptOverrides(overrides);
  await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, promptsJson: cleaned },
    update: { promptsJson: cleaned },
  });
  return cleaned;
}
