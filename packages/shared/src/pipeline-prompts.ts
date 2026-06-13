import { z } from "zod";

export const PIPELINE_PROMPT_IDS = [
  "script_system",
  "intel_system",
  "scene_reference_prefix",
  "scene_type_line",
  "scene_background",
  "scene_subject",
  "scene_text_rules",
  "scene_composition",
  "scene_constraints",
  "scene_blueprint_hook",
  "scene_blueprint_pain",
  "scene_blueprint_proof",
  "scene_blueprint_cta",
  "scene_mood_energetic_palette",
  "scene_mood_energetic_lighting",
  "scene_mood_energetic_typography",
  "scene_mood_trust_palette",
  "scene_mood_trust_lighting",
  "scene_mood_trust_typography",
  "scene_mood_premium_palette",
  "scene_mood_premium_lighting",
  "scene_mood_premium_typography",
] as const;

export type PipelinePromptId = (typeof PIPELINE_PROMPT_IDS)[number];

export type PipelinePromptDefinition = {
  id: PipelinePromptId;
  label: string;
  stage: string;
  description: string;
  defaultContent: string;
};

export const PIPELINE_PROMPT_DEFINITIONS: PipelinePromptDefinition[] = [
  {
    id: "script_system",
    label: "Сценарий — system prompt",
    stage: "Сценарий (OpenAI)",
    description:
      "Инструкция для GPT при написании 4 сцен Hook→Pain→Proof→CTA. Плейсхолдер {{tone}} подставляется по типу ролика.",
    defaultContent: `Ты creative strategist для вирусных performance Reels на русском языке.

Твоя задача — не описать товар, а придумать рекламный микро-сюжет на 15 секунд, который:
1. цепляет конкретную аудиторию,
2. показывает узнаваемую боль,
3. доказывает пользу товара,
4. ведёт к понятному действию.

Формат: 4 сцены Hook → Pain → Proof → CTA.
Каждая сцена — отдельный вертикальный кадр 9:16.
Текст на экране (headline): максимум 6–8 слов.
Никаких общих фраз: «лучшее качество», «выгодная покупка», «успей купить», «супер товар», «краткое описание», «топ товар».
Никаких выдуманных отзывов, рейтингов, скидок, гарантий и дефицита.

Перед сценами ОБЯЗАТЕЛЬНО выбери:
- audience: одна конкретная ЦА
- pain: одна конкретная боль
- desire: желаемый результат
- angle: один рекламный угол
- creativeMechanic: один механизм удержания:
  «узнавание боли», «контраст до/после», «миф/правда», «ошибка выбора», «мини-тест», «POV», «дорого/дёшево», «неочевидная выгода»

Если productConfidence.canUseReviews=false:
- не используй рейтинг,
- не используй кавычки отзывов,
- не пиши «покупатели говорят», «хит продаж», «разбирают», «лучший выбор»,
- используй только подтверждённые характеристики товара.

Если productConfidence.canUsePrice=false — не указывай priceLabel.

CTA должен быть действием, НЕ «На сайт».
Плохо: «На сайт», «Покупай скорее»
Хорошо: «Подобрать модель», «Рассчитать под помещение», «Смотреть характеристики», «Узнать цену», «Выбрать на сайте»

Тон: {{tone}}

templateId: minimal_product_reel_v2 (или problem_solution_v1 / expert_pick_v1 / marketplace_clean_v1 / native_tiktok_v1)
musicMood: energetic | trust | premium
musicTrackId: upbeat_drive | steady_groove | smooth_pulse
voiceoverStyle: calm_confident | energetic | expert

Каждая сцена:
- style: hook | pain | proof | cta
- duration: 3.5 | 3.5 | 4 | 4
- headline (max 8 words), subheadline optional
- visualBrief: описание ТОЛЬКО фона/сцены БЕЗ текста (для AI image). Не дублируй headline.
- motion: punch_in | push_in | product_reveal | button_pop | slow_zoom
- imageIndex: 0–3
- proof: bullets optional (max 2)
- cta: buttonText — осмысленное действие

Верни строго валидный JSON.`,
  },
  {
    id: "intel_system",
    label: "Intel — system prompt",
    stage: "Исследование (OpenAI)",
    description: "Синтез фактов о товаре из Tavily, маркетплейсов и страницы.",
    defaultContent: `Ты аналитик товаров для ВИРУСНЫХ таргетированных Reels.
Извлекай ТОЛЬКО факты из snippets, marketplaceListings и productData. Не выдумывай.

Цель intel — дать сценаристу всё для ХУКА и ТАРГЕТА, чтобы ролик залетел:

1. consumerPainPoints (топ-3): боли КОНКРЕТНОЙ ЦА — язык TikTok («устал от…», «зачем переплачивать…», «опять разочарование»)
2. rankedSellingPoints (топ-5): не сухие specs, а hook-ready выгоды — цифры, контрасты, «вау за эту цену»
3. socialProof: рейтинг, число отзывов — готово для хука «4.9★ и вот почему»
4. marketplaceReviews: смешные/эмоциональные цитаты дословно (до 120 симв.) — главный источник для proof-сцены и reviewQuote в сценарии
5. externalSnippets: факты и цитаты покупателей, которые бьют в ЦА
6. reviewsFromPage: не игнорируй — объедини с marketplaceReviews для сценариста

Таргетинг: по category и отзывам определи, КТО покупает и ЧТО их триггерит (выгода / боль / статус / лень / страх ошибки).
Формулируй pain points и selling points так, чтобы из них можно было собрать scroll-stop хук за 3 секунды.

Приоритет: Ozon, Wildberries, М.Видео, Яндекс Маркет.

Верни JSON: externalSnippets, marketplaceReviews (platform + quote + rating), consumerPainPoints, rankedSellingPoints (топ-5), socialProof, researchSources (URL).`,
  },
  {
    id: "scene_reference_prefix",
    label: "Картинки — reference edit",
    stage: "AI-картинки",
    description: "Префикс при редактировании по фото товара.",
    defaultContent:
      "Use the attached product photo as the hero subject. Preserve product shape, colors, and branding.\nPlace it in a premium minimal commercial scene. Product stays realistic. Background only — NO text overlays.",
  },
  {
    id: "scene_type_line",
    label: "Картинки — тип кадра",
    stage: "AI-картинки",
    description: "Первая строка промпта генерации кадра.",
    defaultContent:
      "TYPE: Background-only visual for vertical product Reel, 9:16 mobile. Premium minimal commercial photography. NO text in image.",
  },
  {
    id: "scene_background",
    label: "Картинки — фон",
    stage: "AI-картинки",
    description: "Секция BACKGROUND.",
    defaultContent:
      "Clean modern environment matching visualBrief. Soft gradients, subtle props. Premium minimal — not marketplace banner, not noisy poster.",
  },
  {
    id: "scene_subject",
    label: "Картинки — объект",
    stage: "AI-картинки",
    description:
      "Секция SUBJECT. Плейсхолдеры: {{product_title}}, {{brand_line}}, {{price_line}}.",
    defaultContent: `Photorealistic product: "{{product_title}}".
{{brand_line}}
Product hero shot — realistic, clean, proportional, not distorted. Premium commercial photography.`,
  },
  {
    id: "scene_text_rules",
    label: "Картинки — запрет текста",
    stage: "AI-картинки",
    description: "Жёсткий запрет текста на изображении.",
    defaultContent: `CRITICAL — NO TEXT IN IMAGE:
NO letters, NO captions, NO logos except original on product packaging.
NO poster design, NO fake UI, NO badges, NO typography, NO numbers overlay.
Leave clean negative space for text overlay (top 180px and bottom 260px safe zones).`,
  },
  {
    id: "scene_composition",
    label: "Картинки — композиция",
    stage: "AI-картинки",
    description: "Секция COMPOSITION.",
    defaultContent:
      "Product hero composition, 9:16 mobile-first. Safe top margin 180px, safe bottom 260px, side margins 72px. Clean negative space for text overlay. Product not cropped.",
  },
  {
    id: "scene_constraints",
    label: "Картинки — ограничения",
    stage: "AI-картинки",
    description: "Секция CONSTRAINTS.",
    defaultContent:
      "Photorealistic product only. No watermarks. No fake logos.\nPremium minimal commercial — not cartoon, not marketplace banner, not AI slop.\nABSOLUTELY NO TEXT, LETTERS, OR TYPOGRAPHY IN THE IMAGE.",
  },
  {
    id: "scene_blueprint_hook",
    label: "Кадр Hook",
    stage: "AI-картинки",
    description: "Blueprint для сцены hook.",
    defaultContent: `FRAME ROLE: HOOK — atmospheric scene, clean negative space at top.
COMPOSITION: Environment or product context, NO text. Warm or contrasting mood per visualBrief.
MOOD: Scroll-stop atmosphere, premium minimal.`,
  },
  {
    id: "scene_blueprint_pain",
    label: "Кадр Pain",
    stage: "AI-картинки",
    description: "Blueprint для сцены pain.",
    defaultContent: `FRAME ROLE: PAIN — relatable environment showing the problem context.
COMPOSITION: Product smaller or absent, emotional atmosphere in background. NO text.
MOOD: Subtle tension, relatable struggle — not depressing.`,
  },
  {
    id: "scene_blueprint_proof",
    label: "Кадр Proof",
    stage: "AI-картинки",
    description: "Blueprint для сцены proof.",
    defaultContent: `FRAME ROLE: PROOF — product as hero solution.
COMPOSITION: Product 45–55% of frame, premium lighting, confident palette. NO text, NO badges.
MOOD: Trust, clarity, professional.`,
  },
  {
    id: "scene_blueprint_cta",
    label: "Кадр CTA",
    stage: "AI-картинки",
    description: "Blueprint для сцены cta.",
    defaultContent: `FRAME ROLE: CTA — product hero with empty bottom safe zone for button overlay.
COMPOSITION: Product centered, clean background, bottom third empty for CTA. NO text in image.
MOOD: Premium, inviting, clear.`,
  },
  {
    id: "scene_mood_energetic_palette",
    label: "Mood energetic — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=energetic.",
    defaultContent:
      "electric violet (#7c3aed) to hot pink (#ec4899), neon coral punch (#fb7185), high saturation TikTok palette",
  },
  {
    id: "scene_mood_energetic_lighting",
    label: "Mood energetic — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=energetic.",
    defaultContent:
      "punchy rim light, crisp key, slight lens flare sparkle — hype commercial, meme-ad bright",
  },
  {
    id: "scene_mood_energetic_typography",
    label: "Mood energetic — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=energetic.",
    defaultContent:
      "extra-bold rounded Cyrillic sans, white with pink/violet glow, sticker/meme poster vibe",
  },
  {
    id: "scene_mood_trust_palette",
    label: "Mood trust — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=trust.",
    defaultContent:
      "warm navy (#0f172a) to friendly teal (#14b8a6), cream highlights, approachable not clinical",
  },
  {
    id: "scene_mood_trust_lighting",
    label: "Mood trust — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=trust.",
    defaultContent:
      "soft daylight, cozy UGC-meets-brand — honest review energy, warm and human",
  },
  {
    id: "scene_mood_trust_typography",
    label: "Mood trust — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=trust.",
    defaultContent:
      "friendly bold Cyrillic sans, conversational headline feel — like a mate recommending a find",
  },
  {
    id: "scene_mood_premium_palette",
    label: "Mood premium — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=premium.",
    defaultContent:
      "rich black to champagne gold (#d4af37), subtle wit in luxe accents — premium but not stiff",
  },
  {
    id: "scene_mood_premium_lighting",
    label: "Mood premium — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=premium.",
    defaultContent:
      "cinematic product glow, soft luxury key — «дорого, но оправдано» campaign look",
  },
  {
    id: "scene_mood_premium_typography",
    label: "Mood premium — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=premium.",
    defaultContent:
      "elegant bold Cyrillic sans, gold/ivory contrast, confident headline with subtle playful edge",
  },
];

export const promptOverridesSchema = z.record(
  z.enum(PIPELINE_PROMPT_IDS),
  z.string()
);

export type PromptOverrides = Partial<Record<PipelinePromptId, string>>;

const DEFAULTS = Object.fromEntries(
  PIPELINE_PROMPT_DEFINITIONS.map((d) => [d.id, d.defaultContent])
) as Record<PipelinePromptId, string>;

export function getDefaultPromptContent(id: PipelinePromptId): string {
  return DEFAULTS[id];
}

export function resolvePromptText(
  id: PipelinePromptId,
  overrides?: PromptOverrides,
  vars?: Record<string, string>
): string {
  const raw = overrides?.[id]?.trim() || DEFAULTS[id];
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    raw
  );
}

export type PipelinePromptView = PipelinePromptDefinition & {
  content: string;
  isCustomized: boolean;
};

export function listPipelinePrompts(
  overrides?: PromptOverrides
): PipelinePromptView[] {
  return PIPELINE_PROMPT_DEFINITIONS.map((def) => {
    const custom = overrides?.[def.id]?.trim();
    return {
      ...def,
      content: custom || def.defaultContent,
      isCustomized: Boolean(custom),
    };
  });
}

export function normalizePromptOverrides(
  raw: unknown
): PromptOverrides {
  const parsed = promptOverridesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
