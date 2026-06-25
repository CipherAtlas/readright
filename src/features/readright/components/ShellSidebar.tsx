import { Bookmark, CircleHelp, FileText, Home, Layers, Menu, Network, PanelLeftClose, Settings } from "lucide-react";
import { classNames } from "../utils/classNames";

export function ShellSidebar({
  compact,
  activeItem,
  onSelect,
  panelOpen,
  onTogglePanel,
}: {
  compact: boolean;
  activeItem: string;
  onSelect: (label: string) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const items = [
    [Home, "Dashboard"],
    [Network, "Analyses"],
    [FileText, "Evidence"],
    [Layers, "Compare"],
    [Bookmark, "Saved"],
    [Settings, "Settings"],
  ] as const;

  return (
    <aside
      className={classNames(
        "hidden shrink-0 flex-col border-r border-ink/10 bg-white/78 backdrop-blur md:flex",
        compact ? "w-[68px]" : "w-20"
      )}
    >
      <div className="flex h-[72px] items-center justify-center border-b border-ink/10">
        <button
          aria-label="Toggle claim panel"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={onTogglePanel}
          title={panelOpen ? "Hide claim panel" : "Show claim panel"}
          type="button"
        >
          <Menu className="h-5 w-5 text-ink/62" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-3 pt-6">
        {items.map(([Icon, label]) => (
          <button
            aria-label={label}
            className={classNames(
              "flex h-12 w-12 items-center justify-center rounded-lg border text-ink/70 transition hover:border-ink/10 hover:bg-ink/[0.04] hover:text-ink",
              activeItem === label
                ? "border-[#d8e7d4] bg-[#e9f2e6] text-[#4f8256]"
                : "border-transparent"
            )}
            key={label}
            onClick={() => onSelect(label)}
            title={label}
            type="button"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
      <div className="flex flex-col items-center gap-3 pb-6">
        <button
          aria-label="Toggle claim panel"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={onTogglePanel}
          title={panelOpen ? "Hide claim panel" : "Show claim panel"}
          type="button"
        >
          <PanelLeftClose className="h-5 w-5 text-ink/55" />
        </button>
        <button
          aria-label="Help"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={() => onSelect("Help")}
          title="Help"
          type="button"
        >
          <CircleHelp className="h-5 w-5 text-ink/55" />
        </button>
      </div>
    </aside>
  );
}

