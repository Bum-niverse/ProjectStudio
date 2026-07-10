import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createDevelopmentFeatureSpec, type FeatureSpec } from "./domain/feature";
import { createFeatureRepository } from "./adapters/featureRepository";

type ViewMode = "tree" | "mindmap";
type FeatureNode = Node<{ feature: FeatureSpec; label: string }>;

interface FeatureMapProps {
  projectId: string;
  sourceDocumentId: string;
}

function layoutFeatures(features: FeatureSpec[], mode: ViewMode): FeatureNode[] {
  const childrenByParent = new Map<string | undefined, FeatureSpec[]>();
  for (const feature of features) {
    const siblings = childrenByParent.get(feature.parentId) ?? [];
    siblings.push(feature);
    childrenByParent.set(feature.parentId, siblings);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const root = features.find((feature) => !feature.parentId);
  if (!root) return [];
  positions.set(root.id, mode === "tree" ? { x: 40, y: 210 } : { x: 420, y: 220 });

  const placeChildren = (parent: FeatureSpec, depth: number) => {
    const children = childrenByParent.get(parent.id) ?? [];
    children.forEach((child, index) => {
      if (mode === "tree") {
        positions.set(child.id, { x: 40 + depth * 270, y: 60 + index * 170 + (depth - 1) * 34 });
      } else {
        const direction = index % 2 === 0 ? 1 : -1;
        const rank = Math.floor(index / 2) + 1;
        const parentPosition = positions.get(parent.id) ?? { x: 420, y: 220 };
        positions.set(child.id, {
          x: parentPosition.x + direction * (220 + depth * 35),
          y: parentPosition.y + (rank - 0.5) * 165 * (depth % 2 === 0 ? -1 : 1),
        });
      }
      placeChildren(child, depth + 1);
    });
  };
  placeChildren(root, 1);

  return features.map((feature) => ({
    id: feature.id,
    position: positions.get(feature.id) ?? { x: 0, y: 0 },
    data: { feature, label: `${feature.title} · ${feature.status}` },
    className: `feature-node priority-${feature.priority}`,
  }));
}

export function FeatureMap({ projectId, sourceDocumentId }: FeatureMapProps) {
  const repository = useMemo(() => createFeatureRepository(), []);
  const generatedFeatures = useMemo(() => createDevelopmentFeatureSpec(projectId), [projectId]);
  const [features, setFeatures] = useState(generatedFeatures);
  const [mode, setMode] = useState<ViewMode>("tree");
  const defaultNodes = useMemo(() => layoutFeatures(features, mode), [features, mode]);
  const [positionsByMode, setPositionsByMode] = useState<Record<ViewMode, Record<string, { x: number; y: number }>>>({ tree: {}, mindmap: {} });
  const [persistenceMessage, setPersistenceMessage] = useState("기능명세를 불러오는 중…");

  useEffect(() => {
    void Promise.all([
      repository.initialize(projectId, sourceDocumentId, generatedFeatures),
      repository.listPositions(projectId),
    ]).then(([storedFeatures, positions]) => {
      setFeatures(storedFeatures);
      setPositionsByMode({
        tree: Object.fromEntries(positions.filter((item) => item.viewMode === "tree").map((item) => [item.featureId, { x: item.positionX, y: item.positionY }])),
        mindmap: Object.fromEntries(positions.filter((item) => item.viewMode === "mindmap").map((item) => [item.featureId, { x: item.positionX, y: item.positionY }])),
      });
      setPersistenceMessage("SQLite와 동기화됨");
    }).catch(() => setPersistenceMessage("기능명세 저장소를 연결하지 못했습니다."));
  }, [generatedFeatures, projectId, repository, sourceDocumentId]);
  const nodes = defaultNodes.map((node) => ({ ...node, position: positionsByMode[mode][node.id] ?? node.position }));
  const edges: Edge[] = features
    .filter((feature) => feature.parentId)
    .map((feature) => ({
      id: `${feature.parentId}-${feature.id}`,
      source: feature.parentId!,
      target: feature.id,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

  const handleNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: FeatureNode) => {
    setPositionsByMode((current) => {
      const updated = { ...current[mode], [node.id]: node.position };
      void repository.savePosition({ projectId, featureId: node.id, viewMode: mode, positionX: node.position.x, positionY: node.position.y })
        .then(() => setPersistenceMessage("노드 위치 저장됨"))
        .catch(() => setPersistenceMessage("노드 위치를 저장하지 못했습니다."));
      return { ...current, [mode]: updated };
    });
  }, [mode, projectId, repository]);

  return (
    <section className="feature-map-section">
      <div className="feature-map-header">
        <div><p className="eyebrow">FEATURE SPECIFICATION</p><h5>계층형 기능명세</h5><small>{persistenceMessage}</small></div>
        <div className="view-switch" aria-label="기능명세 보기 방식">
          <button className={mode === "tree" ? "selected" : ""} onClick={() => setMode("tree")} type="button">트리</button>
          <button className={mode === "mindmap" ? "selected" : ""} onClick={() => setMode("mindmap")} type="button">마인드맵</button>
        </div>
      </div>
      <div className="feature-canvas" data-view-mode={mode}>
        <ReactFlow nodes={nodes} edges={edges} onNodeDragStop={handleNodeDragStop} fitView fitViewOptions={{ padding: 0.25, duration: 350 }} minZoom={0.25} maxZoom={1.8} panOnScroll>
          <Background color="#343741" gap={24} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
