import type { SceneImage } from "@reels-factory/shared";

const SCENE_STYLE_LABEL: Record<string, string> = {
  hook: "Hook",
  pain: "Боль",
  proof: "Доказательство",
  cta: "Призыв",
};

type Props = {
  scenes: SceneImage[];
};

export function GeneratedScenesPanel({ scenes }: Props) {
  const ordered = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
          AI-картинки сцен
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          4 вертикальных кадра — из них соберём видео
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ordered.map((scene) => (
          <div
            key={scene.sceneIndex}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="relative aspect-[9/16] bg-slate-900">
              <img
                src={scene.imageUrl}
                alt={`Сцена ${scene.sceneIndex + 1}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-mono text-white">
                {scene.sceneIndex + 1}/4
              </span>
              {scene.style && (
                <span className="absolute right-2 top-2 rounded-md bg-indigo-600/90 px-2 py-0.5 text-xs font-medium text-white">
                  {SCENE_STYLE_LABEL[scene.style] ?? scene.style}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-slate-800">{scene.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
