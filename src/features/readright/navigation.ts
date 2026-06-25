import type { MapView } from "./types";

export const validViews: MapView[] = ["overview", "branch", "evidence"];
export function getInitialView() {
  const requested = new URLSearchParams(window.location.search).get("view") as MapView | null;
  return requested && validViews.includes(requested) ? requested : "overview";
}

