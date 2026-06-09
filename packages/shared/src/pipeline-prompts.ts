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
    defaultContent: `Ты копирайтер вирусных product Reels (15 сек, 9:16). Язык: русский. Тон: {{tone}}.

Формула Hook → Pain → Proof → Offer+CTA (ровно 4 сцены):
1. hook (0–3.75с): остановить скролл, вопрос или интрига, макс 8 слов
2. pain (3.75–7.5с): боль покупателя, эмпатия, макс 8 слов
3. proof (7.5–11.25с): факт/цифра + social proof или цитата отзыва, макс 10 слов
4. cta (11.25–15с): цена + призыв, макс 8 слов

Правила:
- ТОЛЬКО факты из productIntel и productData. Не выдумывай.
- templateId: "viral_v1"
- musicMood: energetic | trust | premium (по типу ролика)
- musicTrackId: upbeat_drive | steady_groove | smooth_pulse
- scenes: ровно 4, imageIndex 0–3 (разные фото товара)
- style: hook | pain | proof | cta
- headline/subheadline/bullets/reviewQuote — для UI, согласуй с сценами

Верни ТОЛЬКО валидный JSON.`,
  },
  {
    id: "intel_system",
    label: "Intel — system prompt",
    stage: "Исследование (OpenAI)",
    description: "Синтез фактов о товаре из Tavily, маркетплейсов и страницы.",
    defaultContent: `Ты аналитик товаров для рекламных роликов.
Извлекай ТОЛЬКО факты из snippets, marketplaceListings и productData. Запрещено выдумывать характеристики.
Приоритет: отзывы и цены с Ozon, Wildberries, М.Видео, Яндекс Маркет.
Верни JSON: externalSnippets (цитаты до 120 символов), marketplaceReviews (platform + quote + rating), consumerPainPoints, rankedSellingPoints (топ-5 выгод), socialProof, researchSources (URL).`,
  },
  {
    id: "scene_reference_prefix",
    label: "Картинки — reference edit",
    stage: "AI-картинки",
    description: "Префикс при редактировании по фото товара.",
    defaultContent:
      "Use the attached product photo as the hero subject. Preserve product shape, colors, and branding accurately.\nPlace it inside a new premium ad environment — do not replace the product with a generic lookalike.",
  },
  {
    id: "scene_type_line",
    label: "Картинки — тип кадра",
    stage: "AI-картинки",
    description: "Первая строка промпта генерации кадра.",
    defaultContent:
      "TYPE: Award-winning Russian social commerce static ad, 9:16 vertical mobile screen, ultra high-end DTC creative.",
  },
  {
    id: "scene_background",
    label: "Картинки — фон",
    stage: "AI-картинки",
    description: "Секция BACKGROUND.",
    defaultContent:
      "Premium gradient studio backdrop, subtle depth, no clutter, magazine-quality color grading.",
  },
  {
    id: "scene_subject",
    label: "Картинки — объект",
    stage: "AI-картинки",
    description:
      "Секция SUBJECT. Плейсхолдеры: {{product_title}}, {{brand_line}}, {{price_line}}.",
    defaultContent: `Photorealistic product: "{{product_title}}".
{{brand_line}}
{{price_line}}
Product must look sharp, realistic, desirable — studio product photography quality.`,
  },
  {
    id: "scene_text_rules",
    label: "Картинки — текст на кадре",
    stage: "AI-картинки",
    description:
      "Правила текста на изображении. Плейсхолдеры: {{scene_text}}, {{emphasis_line}}.",
    defaultContent: `"{{scene_text}}"
{{emphasis_line}}
Spell Cyrillic correctly. No English UI. No random extra words.`,
  },
  {
    id: "scene_composition",
    label: "Картинки — композиция",
    stage: "AI-картинки",
    description: "Секция COMPOSITION.",
    defaultContent:
      "Rule of thirds, professional ad layout, 8% safe margins, text never cropped.",
  },
  {
    id: "scene_constraints",
    label: "Картинки — ограничения",
    stage: "AI-картинки",
    description: "Секция CONSTRAINTS.",
    defaultContent:
      "Photorealistic only. No watermarks. No logos except product brand.\nNo blurry text, no distorted product, no cheap clip art, no stock-photo feel.\nNo misspelled Russian, no gibberish letters, no duplicate headlines.\nOutput must look like a $5000 agency static ad frame, not AI slop.",
  },
  {
    id: "scene_blueprint_hook",
    label: "Кадр Hook",
    stage: "AI-картинки",
    description: "Blueprint для сцены hook.",
    defaultContent: `FRAME ROLE: Viral Reels HOOK — scroll-stopping first frame.
COMPOSITION: Product hero in lower 45%, headline in upper third, generous safe margins (8%).
MOOD: Pattern interrupt, curiosity, “stop scrolling” energy.`,
  },
  {
    id: "scene_blueprint_pain",
    label: "Кадр Pain",
    stage: "AI-картинки",
    description: "Blueprint для сцены pain.",
    defaultContent: `FRAME ROLE: PAIN — empathize with buyer frustration.
COMPOSITION: Product smaller (30%), emotional headline dominant, moody negative space.
MOOD: Relatable problem, tension before solution, cinematic desaturation.`,
  },
  {
    id: "scene_blueprint_proof",
    label: "Кадр Proof",
    stage: "AI-картинки",
    description: "Blueprint для сцены proof.",
    defaultContent: `FRAME ROLE: PROOF — trust and social validation.
COMPOSITION: Product detail or hero 40%, proof line as quote/stat badge, bright confident layout.
MOOD: Credibility, relief, “this works” confidence.`,
  },
  {
    id: "scene_blueprint_cta",
    label: "Кадр CTA",
    stage: "AI-картинки",
    description: "Blueprint для сцены cta.",
    defaultContent: `FRAME ROLE: CTA — conversion and urgency.
COMPOSITION: Product + price block, prominent CTA strip at bottom third, offer hierarchy.
MOOD: Urgency, clarity, ready to buy.`,
  },
  {
    id: "scene_mood_energetic_palette",
    label: "Mood energetic — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=energetic.",
    defaultContent:
      "deep indigo (#1e1b4b) flowing into electric violet (#7c3aed), hot coral accent (#fb7185)",
  },
  {
    id: "scene_mood_energetic_lighting",
    label: "Mood energetic — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=energetic.",
    defaultContent:
      "crisp studio key light, vibrant rim glow, high-contrast TikTok commercial energy",
  },
  {
    id: "scene_mood_energetic_typography",
    label: "Mood energetic — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=energetic.",
    defaultContent:
      "bold geometric sans-serif Cyrillic, white with soft violet glow, kinetic poster style",
  },
  {
    id: "scene_mood_trust_palette",
    label: "Mood trust — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=trust.",
    defaultContent:
      "soft navy (#0f172a) to calm teal (#0d9488), warm off-white text, subtle grain",
  },
  {
    id: "scene_mood_trust_lighting",
    label: "Mood trust — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=trust.",
    defaultContent:
      "diffused natural daylight, clean trustworthy e-commerce photography",
  },
  {
    id: "scene_mood_trust_typography",
    label: "Mood trust — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=trust.",
    defaultContent:
      "friendly rounded sans-serif Cyrillic, high readability, calm authority",
  },
  {
    id: "scene_mood_premium_palette",
    label: "Mood premium — палитра",
    stage: "AI-картинки",
    description: "Цветовая палитра для mood=premium.",
    defaultContent:
      "charcoal black to champagne gold (#d4af37), subtle marble and velvet texture",
  },
  {
    id: "scene_mood_premium_lighting",
    label: "Mood premium — свет",
    stage: "AI-картинки",
    description: "Освещение для mood=premium.",
    defaultContent:
      "luxury catalog lighting, soft falloff, premium brand campaign aesthetic",
  },
  {
    id: "scene_mood_premium_typography",
    label: "Mood premium — шрифт",
    stage: "AI-картинки",
    description: "Типографика для mood=premium.",
    defaultContent:
      "elegant condensed sans-serif Cyrillic, gold and ivory, high-end retail ad",
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
