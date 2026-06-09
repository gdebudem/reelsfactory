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
    defaultContent: `Ты сценарист ВИРУСНЫХ product Reels (15 сек, 9:16). Язык: русский. Тон: {{tone}}.

Главная цель: ТАРГЕТИРОВАННЫЙ ролик, который ЗАЛЕТАЕТ — смешной, классный, с мощным хуком в первые 1.5 сек. Не реклама из буклета, а креатив, который хочется досмотреть и переслать.

═══ ХУК (самое важное) ═══
Первый кадр решает всё. Выбери ОДИН паттерн под ЦА из reelType + category + userHighlights:
• «Если вы [боль ЦА] — стоп» — прямой таргет
• «POV: вы наконец нашли…» — relatable
• «Почему все берут X, а вы нет?» — curiosity gap
• «Стоп. Это не реклама» / «Серьёзно?» — pattern interrupt
• Цифра + интрига: «4.9★ и вот почему»
• Контраст: «Дорого? Смотрите цену»
• «3 секунды — и вы поймёте» — open loop (ответ только в proof)

Хук = headline = scenes[0].text. Должен бить в конкретную аудиторию, а не «для всех».

═══ ТАРГЕТИНГ ═══
Сузь ролик под ЦА: кто покупает этот товар, какая у них боль, какой мем-язык им зайдёт.
Используй: productData.category, brand, reelType, userHighlights, consumerPainPoints из intel.
Один ролик = одна аудитория = одна боль = один хук. Не размывай.

═══ Формула Hook → Pain → Proof → Offer+CTA (4 сцены) ═══
1. hook (0–3.75с): scroll-stop, таргет + интрига/юмор, макс 8 слов, open loop
2. pain (3.75–7.5с): «это про меня» для ЦА, с иронией, макс 8 слов
3. proof (7.5–11.25с): закрывает loop — факт/отзыв/рейтинг, макс 10 слов
4. cta (11.25–15с): цена + призыв, энергия FOMO, макс 8 слов

═══ Чтобы залетал ═══
- Каждая сцена — новый удар, не повторяй формулировки
- Юмор от фактов: цена, отзыв, характеристика — не выдумывай
- subheadline усиливает хук; bullets — 2–3 коротких «почему зайдёт ЦА»
- reviewQuote — реальный отзыв; смешной/эмоциональный приоритет
- Без токсичности, кринжа, fake urgency, выдуманных обещаний

Техника:
- templateId: "viral_v1"
- musicMood: energetic | trust | premium
- musicTrackId: upbeat_drive | steady_groove | smooth_pulse
- scenes: ровно 4, imageIndex 0–3, style: hook | pain | proof | cta

Верни ТОЛЬКО валидный JSON.`,
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
4. marketplaceReviews: смешные/эмоциональные цитаты дословно (до 120 симв.) — для proof и reviewQuote
5. externalSnippets: факты, которые бьют в ЦА и отличают от конкурентов

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
      "Use the attached product photo as the hero subject. Preserve product shape, colors, and branding.\nPlace it in a bold, meme-worthy TikTok ad set — expressive, not boring catalog. Product stays real; background gets personality.",
  },
  {
    id: "scene_type_line",
    label: "Картинки — тип кадра",
    stage: "AI-картинки",
    description: "Первая строка промпта генерации кадра.",
    defaultContent:
      "TYPE: Viral targeted Russian product Reels frame, 9:16 mobile — scroll-stopping hook visual, funny, premium-cool, algorithm-native, not corporate ad.",
  },
  {
    id: "scene_background",
    label: "Картинки — фон",
    stage: "AI-картинки",
    description: "Секция BACKGROUND.",
    defaultContent:
      "Dynamic gradient or playful studio set, subtle props that support the joke/mood, vibrant but clean — TikTok ad energy, not sterile white box.",
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
Product looks sharp and desirable — hero shot with personality, slight dramatic angle, «this is the one» energy.`,
  },
  {
    id: "scene_text_rules",
    label: "Картинки — текст на кадре",
    stage: "AI-картинки",
    description:
      "Правила текста на изображении. Плейсхолдеры: {{scene_text}}, {{emphasis_line}}.",
    defaultContent: `"{{scene_text}}"
{{emphasis_line}}
Hook text dominates frame — extra-bold meme Cyrillic, high contrast, readable in 0.3 sec on mobile feed. Spell correctly. No English clutter.`,
  },
  {
    id: "scene_composition",
    label: "Картинки — композиция",
    stage: "AI-картинки",
    description: "Секция COMPOSITION.",
    defaultContent:
      "Hook-first TikTok layout: headline is the star, product supports the hook, 8% safe margins, reads in 0.3 sec on feed scroll.",
  },
  {
    id: "scene_constraints",
    label: "Картинки — ограничения",
    stage: "AI-картинки",
    description: "Секция CONSTRAINTS.",
    defaultContent:
      "Photorealistic product. No watermarks. No fake logos.\nExpressive and fun — not stock-photo bland, not AI slop, not cheap clip art.\nPerfect Cyrillic on overlay text. Must feel like a viral product meme ad, not a boring banner.",
  },
  {
    id: "scene_blueprint_hook",
    label: "Кадр Hook",
    stage: "AI-картинки",
    description: "Blueprint для сцены hook.",
    defaultContent: `FRAME ROLE: HOOK — scroll-stop, таргетированный, «залетает» с первого кадра.
COMPOSITION: Giant hook text upper 35% (biggest element on screen), product lower 40%, visual tension — viewer MUST pause thumb.
MOOD: Pattern interrupt — surprise, curiosity, cool confidence, subtle humor. Feels like viral TikTok hook, not banner ad.`,
  },
  {
    id: "scene_blueprint_pain",
    label: "Кадр Pain",
    stage: "AI-картинки",
    description: "Blueprint для сцены pain.",
    defaultContent: `FRAME ROLE: PAIN — relatable struggle (with humor).
COMPOSITION: Product smaller, emotional headline dominates, exaggerated «before» mood in background.
MOOD: «Блин, это же про меня» — ironic, empathetic, not depressing.`,
  },
  {
    id: "scene_blueprint_proof",
    label: "Кадр Proof",
    stage: "AI-картинки",
    description: "Blueprint для сцены proof.",
    defaultContent: `FRAME ROLE: PROOF — «окей, это реально работает».
COMPOSITION: Product hero 45%, quote/stat badge, brighter confident palette.
MOOD: Satisfied smirk energy, trust + delight, «наконец-то нормальная вещь».`,
  },
  {
    id: "scene_blueprint_cta",
    label: "Кадр CTA",
    stage: "AI-картинки",
    description: "Blueprint для сцены cta.",
    defaultContent: `FRAME ROLE: CTA — «беру, пока не разобрали».
COMPOSITION: Product + bold price, CTA strip bottom third, urgency without panic.
MOOD: Fun FOMO, clear next step, celebratory micro-win.`,
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
