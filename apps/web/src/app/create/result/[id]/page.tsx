import { JobProgress } from "@/components/JobProgress";

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ started?: string }>;
}) {
  const { id } = await params;
  const { started } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JobProgress jobId={id} pipelineStarted={started === "1"} />
    </div>
  );
}
