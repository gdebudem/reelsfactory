import { CreateWizard } from "@/components/CreateWizard";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Создать ролик</h1>
      <p className="mt-2 text-slate-600">4 вопроса — и видео готово</p>
      <div className="mt-10">
        <CreateWizard />
      </div>
    </div>
  );
}
