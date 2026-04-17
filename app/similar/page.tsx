import SimilarProblemClient from "./SimilarProblemClient";

type SimilarProblemPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function SimilarProblemPage({
  searchParams,
}: SimilarProblemPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const historyIdValue = readSingleParam(resolvedSearchParams.historyId);
  const source = readSingleParam(resolvedSearchParams.source);
  const historyId = historyIdValue ? Number(historyIdValue) : null;

  return (
    <SimilarProblemClient
      historyId={Number.isNaN(historyId ?? NaN) ? null : historyId}
      source={source}
    />
  );
}
