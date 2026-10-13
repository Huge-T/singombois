import { RekapPage, type RekapSearchParams } from "@/components/rekap/RekapPage";

export default function BkRekapPage({ searchParams }: { searchParams: Promise<RekapSearchParams> }) {
  return <RekapPage basePath="/bk/rekap" roleLabel="GURU BK" searchParams={searchParams} />;
}
