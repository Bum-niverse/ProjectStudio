import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createDevelopmentFeatureSpec, type FeatureSpec } from "./domain/feature";
import { createFeatureRepository } from "./adapters/featureRepository";
import { FeatureDocumentView } from "./FeatureDocumentView";
import { FeatureEditor } from "./FeatureDocumentView";
import { FeatureNodeCard, type FeatureNodeData } from "./FeatureNodeCard";
import { FeatureProposalPanel } from "./FeatureProposalPanel";

type ViewMode = "tree" | "mindmap";
type WorkspaceViewMode = "document" | ViewMode;
type FeatureNode = Node<FeatureNodeData>;
const nodeTypes = { feature: FeatureNodeCard };
const MAGNET_DISTANCE = 34;

function magnetize(value: number, candidates: number[]): number {
  const closest = candidates.reduce((best, candidate) => Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best, value);
  return Math.abs(closest - value) <= MAGNET_DISTANCE ? closest : value;
}

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
  positions.set(root.id, mode === "tree" ? { x: 40, y: 210 } : { x: 430, y: 260 });

  const mindMapAngles = new Map<string, number>();
  if (mode === "mindmap") {
    const leaves = features.filter((feature) => (childrenByParent.get(feature.id) ?? []).length === 0);
    leaves.forEach((leaf, index) => {
      mindMapAngles.set(leaf.id, -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(leaves.length, 1));
    });
    const resolveAngle = (feature: FeatureSpec): number => {
      const saved = mindMapAngles.get(feature.id);
      if (saved !== undefined) return saved;
      const childAngles = (childrenByParent.get(feature.id) ?? []).map(resolveAngle);
      const angle = childAngles.reduce((sum, value) => sum + value, 0) / Math.max(childAngles.length, 1);
      mindMapAngles.set(feature.id, angle);
      return angle;
    };
    resolveAngle(root);
  }

  if (mode === "tree") {
    let nextLeafRow = 0;
    const placeTreeNode = (feature: FeatureSpec, depth: number): number => {
      const children = childrenByParent.get(feature.id) ?? [];
      const y = children.length === 0
        ? 35 + nextLeafRow++ * 74
        : children.map((child) => placeTreeNode(child, depth + 1)).reduce((sum, value) => sum + value, 0) / children.length;
      positions.set(feature.id, { x: 30 + depth * 270, y });
      return y;
    };
    placeTreeNode(root, 0);
  }

  const placeChildren = (parent: FeatureSpec, depth: number) => {
    const children = childrenByParent.get(parent.id) ?? [];
    children.forEach((child) => {
      if (mode === "mindmap") {
        const angle = mindMapAngles.get(child.id) ?? 0;
        const radius = depth * 230;
        positions.set(child.id, {
          x: 430 + Math.cos(angle) * radius,
          y: 260 + Math.sin(angle) * radius,
        });
        placeChildren(child, depth + 1);
        return;
      }
      placeChildren(child, depth + 1);
    });
  };
  placeChildren(root, 1);

  return features.map((feature) => ({
    id: feature.id,
    position: positions.get(feature.id) ?? { x: 0, y: 0 },
    data: { feature, label: `${feature.title} · ${feature.status}` },
    type: "feature",
  }));
}

export function FeatureMap({ projectId, sourceDocumentId }: FeatureMapProps) {
  const repository = useMemo(() => createFeatureRepository(), []);
  const generatedFeatures = useMemo(() => createDevelopmentFeatureSpec(projectId), [projectId]);
  const [features, setFeatures] = useState(generatedFeatures);
  const [mode, setMode] = useState<WorkspaceViewMode>("document");
  const mapMode: ViewMode = mode === "mindmap" ? "mindmap" : "tree";
  const defaultNodes = useMemo(() => layoutFeatures(features, mapMode), [features, mapMode]);
  const [positionsByMode, setPositionsByMode] = useState<Record<ViewMode, Record<string, { x: number; y: number }>>>({ tree: {}, mindmap: {} });
  const [persistenceMessage, setPersistenceMessage] = useState("기능명세를 불러오는 중…");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>();
  const [isProposalPanelOpen, setIsProposalPanelOpen] = useState(false);

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
  const nodes = defaultNodes.map((node) => ({ ...node, position: positionsByMode[mapMode][node.id] ?? node.position }));
  const edges: Edge[] = features
    .filter((feature) => feature.parentId)
    .map((feature) => ({
      id: `${feature.parentId}-${feature.id}`,
      source: feature.parentId!,
      target: feature.id,
      type: "default",
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

  const handleNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: FeatureNode) => {
    const otherNodes = nodes.filter((item) => item.id !== node.id);
    const position = {
      x: magnetize(node.position.x, otherNodes.map((item) => item.position.x)),
      y: magnetize(node.position.y, otherNodes.map((item) => item.position.y)),
    };
    setPositionsByMode((current) => {
      const updated = { ...current[mapMode], [node.id]: position };
      void repository.savePosition({ projectId, featureId: node.id, viewMode: mapMode, positionX: position.x, positionY: position.y })
        .then(() => setPersistenceMessage("노드 위치 저장됨"))
        .catch(() => setPersistenceMessage("노드 위치를 저장하지 못했습니다."));
      return { ...current, [mapMode]: updated };
    });
  }, [mapMode, nodes, projectId, repository]);

  async function handleSaveFeature(feature: FeatureSpec) {
    const saved = await repository.updateFeature(projectId, feature);
    setFeatures((current) => current.map((item) => item.id === saved.id ? saved : item));
  }

  function handleAcceptedProposal(feature: FeatureSpec) {
    setFeatures((current) => current.map((item) => item.id === feature.id ? feature : item));
    setPersistenceMessage("승인한 AI 변경안을 기능명세에 반영했습니다.");
  }

  async function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    try {
      const updated = await repository.reparentFeature(projectId, connection.target, connection.source);
      setFeatures(updated);
      setPersistenceMessage("기능 관계를 저장했습니다.");
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : "기능 관계를 저장하지 못했습니다.");
    }
  }

  function handleResetLayout() {
    const positions = Object.fromEntries(defaultNodes.map((node) => [node.id, node.position]));
    setPositionsByMode((current) => ({ ...current, [mapMode]: positions }));
    void Promise.all(defaultNodes.map((node) => repository.savePosition({ projectId, featureId: node.id, viewMode: mapMode, positionX: node.position.x, positionY: node.position.y })))
      .then(() => setPersistenceMessage("기본 정렬을 저장했습니다."))
      .catch(() => setPersistenceMessage("기본 정렬을 저장하지 못했습니다."));
  }

  const selectedFeature = features.find((feature) => feature.id === selectedFeatureId);

  return (
    <section className="feature-map-section">
      <div className="feature-map-header">
        <div><p className="eyebrow">03 · FEATURE SPECIFICATION</p><h5>계층형 기능명세</h5><small>{persistenceMessage}</small></div>
        <div className="view-switch" aria-label="기능명세 보기 방식">
          <button className={mode === "document" ? "selected" : ""} onClick={() => setMode("document")} type="button">문서</button>
          <button className={mode === "tree" ? "selected" : ""} onClick={() => setMode("tree")} type="button">트리</button>
          <button className={mode === "mindmap" ? "selected" : ""} onClick={() => setMode("mindmap")} type="button">마인드맵</button>
          {mode !== "document" && <button onClick={handleResetLayout} type="button">기본 정렬</button>}
          <button className="proposal-open-button" onClick={() => setIsProposalPanelOpen(true)} type="button">AI 변경안</button>
        </div>
      </div>
      {mode === "document" ? <FeatureDocumentView features={features} onSave={handleSaveFeature} /> : <div className="feature-canvas" data-view-mode={mode}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onConnect={(connection) => void handleConnect(connection)} onNodeClick={(_, node) => setSelectedFeatureId(node.id)} onNodeDragStop={handleNodeDragStop} fitView fitViewOptions={{ padding: 0.18, duration: 350, maxZoom: 0.9 }} minZoom={0.25} maxZoom={1.8} panOnScroll>
          <Background color="#343741" gap={24} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
        {selectedFeature && <aside className="node-document-panel"><button className="panel-close" onClick={() => setSelectedFeatureId(undefined)} type="button">×</button><FeatureEditor key={selectedFeature.id} feature={selectedFeature} onSave={handleSaveFeature} /></aside>}
      </div>}
      <FeatureProposalPanel projectId={projectId} features={features} isOpen={isProposalPanelOpen} onClose={() => setIsProposalPanelOpen(false)} onAccepted={handleAcceptedProposal} />
    </section>
  );
}
