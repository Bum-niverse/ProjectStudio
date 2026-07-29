import type { FeatureSpec } from "../domain/feature";
import type { ProjectWithPrd } from "../domain/project";
import type { SystemDesignWorkspace } from "../domain/systemDesign";
import type { UserFlowEdge, UserFlowNode } from "../domain/userFlow";
import type { FeaturePosition } from "../ports/featureRepository";
import { isTauri } from "@tauri-apps/api/core";
import fixture from "./globeat-demo.json";

const browserLocation = typeof window === "undefined" ? undefined : window.location;
export const isPublicDemo = !isTauri() && Boolean(browserLocation) &&
  (browserLocation!.pathname.startsWith("/ProjectStudio/") || new URLSearchParams(browserLocation!.search).get("demo") === "1");

export const globeatDemo = fixture as {
  projectWithPrd: ProjectWithPrd;
  features: FeatureSpec[];
  positions: FeaturePosition[];
  userFlow: { nodes: UserFlowNode[]; edges: UserFlowEdge[] };
  systemDesign: SystemDesignWorkspace;
};

export const isGlobeatDemoProject = (projectId: string) =>
  isPublicDemo && projectId === globeatDemo.projectWithPrd.project.id;

export function resetPublicDemo() {
  const prefix = `projectstudio:${globeatDemo.projectWithPrd.project.id}:`;
  Object.keys(localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}
