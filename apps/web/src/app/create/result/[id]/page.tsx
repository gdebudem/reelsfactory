import { JobProgress } from "@/components/JobProgress";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JobProgress jobId={id} />
    </div>
  );
}
