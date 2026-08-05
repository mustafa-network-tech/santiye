import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
};

const SHORTCUTS = [
  {
    type: "BF",
    className:
      "bg-violet-600 text-white shadow-violet-600/25 hover:bg-violet-700",
  },
  {
    type: "GF",
    className:
      "bg-cyan-600 text-white shadow-cyan-600/25 hover:bg-cyan-700",
  },
] as const;

export function ProjectTypeShortcuts({ compact = false }: Props) {
  return (
    <div className="flex items-center gap-3" aria-label="Hızlı proje erişimi">
      {SHORTCUTS.map((shortcut) => (
        <Link
          key={shortcut.type}
          href={`/projects?type=${shortcut.type}`}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            compact ? "h-12 w-12 text-sm" : "h-16 w-16 text-base",
            shortcut.className
          )}
          title={`${shortcut.type} projelerine git`}
        >
          {shortcut.type}
        </Link>
      ))}
    </div>
  );
}
