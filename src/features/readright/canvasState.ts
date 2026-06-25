import type { EvidenceTopic } from "../../types/evidence";
import type { CanvasDocument, CanvasEditorState } from "./types";

export function cloneCanvasState(state: CanvasEditorState): CanvasEditorState {
  return {
    nodes: state.nodes.map((node) => ({ ...node })),
    arrows: state.arrows.map((arrow) => ({ ...arrow })),
  };
}

export function canvasStateFromDocument(canvas: CanvasDocument): CanvasEditorState {
  return cloneCanvasState({
    nodes: Array.isArray(canvas.nodes) ? canvas.nodes : [],
    arrows: Array.isArray(canvas.arrows) ? canvas.arrows : [],
  });
}

export function isSameCanvasState(first?: CanvasEditorState, second?: CanvasEditorState) {
  if (!first || !second) return false;
  return JSON.stringify(first) === JSON.stringify(second);
}


export function canvasIdForTopic(topic: EvidenceTopic, live: boolean) {
  return live ? topic.id : "demo-workspace";
}

