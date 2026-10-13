import { RekapPage, type RekapSearchParams } from "@/components/rekap/RekapPage";

export default function KoordinatorRekapPage({ searchParams }: { searchParams: Promise<RekapSearchParams> }) {
  return <RekapPage basePath="/koordinator/rekap" roleLabel="KOORDINATOR" searchParams={searchParams} />;
}
