import type { Source } from "@/lib/api";

export default function SourceCard({ source }: { source: Source }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      📖 {source.source ?? "SGK"}{source.page ? ` tr.${source.page}` : ""}
    </span>
  );
}
