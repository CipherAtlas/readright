import { ExternalLink } from "lucide-react";
import type { WorkspaceSource } from "../types";
import { classNames } from "../utils/classNames";

export function SourceArticleLink({
  source,
  compact = false,
}: {
  source: WorkspaceSource;
  compact?: boolean;
}) {
  if (!source.url) return null;

  return (
    <a
      aria-label={`Open article: ${source.title}`}
      className={classNames(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#d8a729]/35 bg-white font-semibold text-[#8b5d0d] transition hover:border-[#d8a729]/55 hover:bg-[#fff7e6]",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
      )}
      href={source.url}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      target="_blank"
    >
      Open article
      <ExternalLink className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </a>
  );
}
