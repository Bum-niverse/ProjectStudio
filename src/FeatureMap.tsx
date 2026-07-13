import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createDevelopmentFeatureSpec, NODE_COLORS, type FeatureSpec, type NodeColorKey } from "./domain/feature";
import { createFeatureRepository } from "./adapters/featureRepository";
import { FeatureDocumentView } from "./FeatureDocumentView";
import { FeatureEditor } from "./FeatureDocumentView";
import { FeatureNodeCard, type FeatureNodeData } from "./FeatureNodeCard";
import { FeatureProposalPanel } from "./FeatureProposalPanel";

type ViewMode = "tree" | "mindmap";
type WorkspaceViewMode = "document" | ViewMode;
type LayoutDensity = "default" | "compact";
type FeatureNode = Node<FeatureNodeData>;
const nodeTypes = { feature: FeatureNodeCard };
const MAGNET_DISTANCE = 34;
const FEATURE_NODE_LAYOUT_VERSION="readable-tree-spacing-v7";
const FEATURE_BRANCH_COLOR_VERSION="idea-driven-colors-v3";
const BRANCH_COLORS:NodeColorKey[]=["green","cyan","amber","violet","rose","slate"];

function colorFeatureBranches(features:FeatureSpec[]):FeatureSpec[]{const root=features.find(feature=>!feature.parentId);if(!root)return features;const rootId=root.id;const byId=new Map(features.map(feature=>[feature.id,feature]));const branches=features.filter(feature=>feature.parentId===rootId).sort((a,b)=>a.sortOrder-b.sortOrder);const branchColors=new Map(branches.map((branch,index)=>[branch.id,BRANCH_COLORS[index%BRANCH_COLORS.length]]));function resolve(feature:FeatureSpec):NodeColorKey{let current=feature;while(current.parentId&&current.parentId!==rootId){const parent=byId.get(current.parentId);if(!parent)break;current=parent;}return branchColors.get(current.id)??"slate";}return features.map(feature=>({...feature,colorKey:feature.id===rootId?"slate":resolve(feature)}));}

function magnetize(value: number, candidates: number[]): number {
  const closest = candidates.reduce((best, candidate) => Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best, value);
  return Math.abs(closest - value) <= MAGNET_DISTANCE ? closest : value;
}

interface FeatureMapProps {
  projectId: string;
  sourceDocumentId: string;
  projectName?: string;
  projectIdea?: string;
}

function descendantsOf(features:FeatureSpec[],originId:string):FeatureSpec[]{
  const visible=new Set([originId]);let changed=true;
  while(changed){changed=false;for(const feature of features){if(feature.parentId&&visible.has(feature.parentId)&&!visible.has(feature.id)){visible.add(feature.id);changed=true;}}}
  return features.filter(feature=>visible.has(feature.id));
}

export function layoutFeatures(features: FeatureSpec[], mode: ViewMode, density:LayoutDensity="default",rootOverride?:string): FeatureNode[] {
  const childrenByParent = new Map<string | undefined, FeatureSpec[]>();
  for (const feature of features) {
    const siblings = childrenByParent.get(feature.parentId) ?? [];
    siblings.push(feature);
    childrenByParent.set(feature.parentId, siblings);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const root = features.find((feature) => feature.id===rootOverride)??features.find((feature) => !feature.parentId);
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
      if(feature.parentId===root.id&&nextLeafRow>0)nextLeafRow+=density==="compact"?1:2;
      const children = childrenByParent.get(feature.id) ?? [];
      const horizontalGap=density==="compact"?330:440;
      const rowGap=density==="compact"?68:118;
      const y = children.length === 0 ? 50 + nextLeafRow++ * rowGap : children.map((child) => placeTreeNode(child, depth + 1)).reduce((sum, value) => sum + value, 0) / children.length;
      positions.set(feature.id, { x: 30 + depth * horizontalGap, y });
      return y;
    };
    placeTreeNode(root, 0);
  }

  const placeChildren = (parent: FeatureSpec, depth: number) => {
    const children = childrenByParent.get(parent.id) ?? [];
    children.forEach((child) => {
      if (mode === "mindmap") {
        const angle = mindMapAngles.get(child.id) ?? 0;
        const radius = depth * (density==="compact"?270:320);
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

export function FeatureMap({ projectId, sourceDocumentId, projectName,projectIdea }: FeatureMapProps) {
  const repository = useMemo(() => createFeatureRepository(), []);
  const generatedFeatures = useMemo(() => createDevelopmentFeatureSpec(projectId, projectName,projectIdea), [projectId, projectName,projectIdea]);
  const [features, setFeatures] = useState(generatedFeatures);
  const [mode, setMode] = useState<WorkspaceViewMode>("document");
  const [layoutDensity,setLayoutDensity]=useState<LayoutDensity>("default");
  const [activeBranchId,setActiveBranchId]=useState<string>("all");
  const mapMode: ViewMode = mode === "mindmap" ? "mindmap" : "tree";
  const rootFeature=features.find(feature=>!feature.parentId);
  const majorFeatures=features.filter(feature=>feature.parentId===rootFeature?.id).sort((a,b)=>a.sortOrder-b.sortOrder);
  const visibleFeatures=useMemo(()=>mode==="tree"&&activeBranchId!=="all"?descendantsOf(features,activeBranchId):features,[activeBranchId,features,mode]);
  const defaultNodes = useMemo(() => layoutFeatures(visibleFeatures, mapMode,layoutDensity,activeBranchId!=="all"?activeBranchId:undefined), [activeBranchId,layoutDensity,mapMode,visibleFeatures]);
  const [positionsByMode, setPositionsByMode] = useState<Record<ViewMode, Record<string, { x: number; y: number }>>>({ tree: {}, mindmap: {} });
  const [persistenceMessage, setPersistenceMessage] = useState("기능명세를 불러오는 중…");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>();
  const [activeNodeId, setActiveNodeId] = useState<string>();
  const [isProposalPanelOpen, setIsProposalPanelOpen] = useState(false);
  const[edgeMenu,setEdgeMenu]=useState<{id:string;target:string;x:number;y:number}>();

  useEffect(() => {
    void Promise.all([
      repository.initialize(projectId, sourceDocumentId, generatedFeatures),
      repository.listPositions(projectId),
    ]).then(([storedFeatures, positions]) => {
      const colorKey=`projectstudio:${projectId}:feature-branch-colors`;const shouldColor=localStorage.getItem(colorKey)!==FEATURE_BRANCH_COLOR_VERSION;const displayFeatures=shouldColor?colorFeatureBranches(storedFeatures):storedFeatures;setFeatures(displayFeatures);if(shouldColor)void Promise.all(displayFeatures.map(feature=>repository.updateFeature(projectId,feature))).then(()=>localStorage.setItem(colorKey,FEATURE_BRANCH_COLOR_VERSION));
      const layoutKey=`projectstudio:${projectId}:feature-node-layout`;const shouldUpgrade=localStorage.getItem(layoutKey)!==FEATURE_NODE_LAYOUT_VERSION;
      if(shouldUpgrade){const tree=layoutFeatures(displayFeatures,"tree");const mindmap=layoutFeatures(displayFeatures,"mindmap");setPositionsByMode({tree:Object.fromEntries(tree.map(node=>[node.id,node.position])),mindmap:Object.fromEntries(mindmap.map(node=>[node.id,node.position]))});void Promise.all([...tree.map(node=>repository.savePosition({projectId,featureId:node.id,viewMode:"tree",positionX:node.position.x,positionY:node.position.y})),...mindmap.map(node=>repository.savePosition({projectId,featureId:node.id,viewMode:"mindmap",positionX:node.position.x,positionY:node.position.y}))]).then(()=>localStorage.setItem(layoutKey,FEATURE_NODE_LAYOUT_VERSION));setPersistenceMessage("대주제 색상과 그룹 간격을 적용했습니다.");}else{setPositionsByMode({tree:Object.fromEntries(positions.filter(item=>item.viewMode==="tree").map(item=>[item.featureId,{x:item.positionX,y:item.positionY}])),mindmap:Object.fromEntries(positions.filter(item=>item.viewMode==="mindmap").map(item=>[item.featureId,{x:item.positionX,y:item.positionY}]))});setPersistenceMessage("SQLite와 동기화됨");}
    }).catch(() => setPersistenceMessage("기능명세 저장소를 연결하지 못했습니다."));
  }, [generatedFeatures, projectId, repository, sourceDocumentId]);
  const rootId=rootFeature?.id;const nodes = defaultNodes.map((node) => ({ ...node, selected:node.id===activeNodeId, position: activeBranchId==="all"?(positionsByMode[mapMode][node.id] ?? node.position):node.position, data: { ...node.data,isMajor:node.data.feature.parentId===rootId||node.id===activeBranchId, onSelect:(feature:FeatureSpec)=>setActiveNodeId(current=>current===feature.id?undefined:feature.id), onAdd: handleAddFeature, onEdit: (feature:FeatureSpec)=>setSelectedFeatureId(feature.id), onDelete: handleDeleteFeature } }));
  const visibleIds=new Set(visibleFeatures.map(feature=>feature.id));
  const edges: Edge[] = visibleFeatures
    .filter((feature) => feature.parentId&&visibleIds.has(feature.parentId))
    .map((feature) => {const color=NODE_COLORS.find(item=>item.key===feature.colorKey)?.color??"var(--theme-border)";return({
      id: `${feature.parentId}-${feature.id}`,
      source: feature.parentId!,
      target: feature.id,
      type: "smoothstep",
      style:{stroke:color,strokeWidth:1.4},markerEnd: { type: MarkerType.ArrowClosed,color },
    });});

  function handleNodeDragStop(_: MouseEvent | TouchEvent, node: FeatureNode) {
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
  }

  async function handleSaveFeature(feature: FeatureSpec) {
    const saved = await repository.updateFeature(projectId, feature);
    setFeatures((current) => current.map((item) => item.id === saved.id ? saved : item));
  }

  async function handleAddFeature(parent:FeatureSpec){
    const id=`${projectId}-feature-${crypto.randomUUID()}`;const feature:FeatureSpec={id,parentId:parent.id,title:"새 기능",description:"새 기능의 목적과 사용자 흐름을 작성해 주세요.",status:"planned",priority:parent.priority,role:parent.role,sortOrder:Math.max(0,...features.map(item=>item.sortOrder))+1,acceptanceCriteria:[],colorKey:parent.colorKey??"cyan"};
    try{const updated=await repository.createFeature(projectId,feature);setFeatures(updated.length>1?updated:[...features,feature]);const parentPosition=nodes.find(node=>node.id===parent.id)?.position??{x:0,y:0};const position={x:parentPosition.x+350,y:parentPosition.y+80};setPositionsByMode(current=>({...current,[mapMode]:{...current[mapMode],[id]:position}}));await repository.savePosition({projectId,featureId:id,viewMode:mapMode,positionX:position.x,positionY:position.y});setActiveNodeId(id);setSelectedFeatureId(id);setPersistenceMessage("새 하위 기능을 추가했습니다.");}catch(error){setPersistenceMessage(error instanceof Error?error.message:"기능을 추가하지 못했습니다.");}
  }

  async function handleDeleteFeature(feature:FeatureSpec){
    if(!feature.parentId){setPersistenceMessage("루트 기능은 삭제할 수 없습니다.");return;}const descendantCount=features.filter(item=>item.parentId===feature.id).length;if(!window.confirm(`‘${feature.title}’을 삭제할까요?${descendantCount?` 직접 하위 기능 ${descendantCount}개도 함께 삭제됩니다.`:""}`))return;
    try{const updated=await repository.deleteFeature(projectId,feature.id);setFeatures(updated.length?updated:features.filter(item=>item.id!==feature.id&&item.parentId!==feature.id));setActiveNodeId(undefined);setSelectedFeatureId(undefined);setPersistenceMessage("기능과 연결된 하위 항목을 삭제했습니다.");}catch(error){setPersistenceMessage(error instanceof Error?error.message:"기능을 삭제하지 못했습니다.");}
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

  async function handleDeleteEdge(){if(!edgeMenu)return;try{const updated=await repository.disconnectFeature(projectId,edgeMenu.target);setFeatures(updated);setEdgeMenu(undefined);setPersistenceMessage("연결선을 삭제했습니다. 하위 문서는 독립된 요구사항으로 유지됩니다.");}catch(error){setPersistenceMessage(error instanceof Error?error.message:"연결선을 삭제하지 못했습니다.");}}

  function handleResetLayout(density:LayoutDensity) {
    setLayoutDensity(density);const layout=layoutFeatures(features,mapMode,density);
    const positions = Object.fromEntries(layout.map((node) => [node.id, node.position]));
    setPositionsByMode((current) => ({ ...current, [mapMode]: positions }));
    void Promise.all(layout.map((node) => repository.savePosition({ projectId, featureId: node.id, viewMode: mapMode, positionX: node.position.x, positionY: node.position.y })))
      .then(() => setPersistenceMessage(density==="compact"?"노드를 압축한 좁은 정렬을 저장했습니다.":"연결 관계를 펼친 기본 정렬을 저장했습니다."))
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
          <button className="proposal-open-button" onClick={() => setIsProposalPanelOpen(true)} type="button">AI 변경안</button>
        </div>
      </div>
      {mode === "tree"&&<nav aria-label="기능명세 대주제 시트" className="feature-tree-sheet-tabs"><button aria-current={activeBranchId==="all"?"page":undefined} className={activeBranchId==="all"?"selected":""} onClick={()=>setActiveBranchId("all")} type="button">전체 기능</button>{majorFeatures.map(feature=><button aria-current={activeBranchId===feature.id?"page":undefined} className={activeBranchId===feature.id?"selected":""} key={feature.id} onClick={()=>setActiveBranchId(feature.id)} type="button">{feature.title}</button>)}</nav>}
      {mode === "document" ? <FeatureDocumentView features={features} onSave={handleSaveFeature} /> : <div className="feature-canvas" data-view-mode={mode}>
        <ReactFlow nodes={nodes} edges={edges.map(edge=>({...edge,selected:edge.id===edgeMenu?.id}))} nodeTypes={nodeTypes} onConnect={(connection) => void handleConnect(connection)} onEdgeClick={(event,edge)=>{event.stopPropagation();const canvas=(event.currentTarget as Element).closest(".feature-canvas")?.getBoundingClientRect();if(canvas)setEdgeMenu({id:edge.id,target:edge.target,x:event.clientX-canvas.left,y:event.clientY-canvas.top});}} onPaneClick={()=>setEdgeMenu(undefined)} onNodeDragStop={handleNodeDragStop} fitView fitViewOptions={{ padding: 0.12, duration: 0, maxZoom: 0.9 }} onInit={instance=>requestAnimationFrame(()=>requestAnimationFrame(()=>void instance.fitView({padding:.12,maxZoom:.9,duration:0})))} minZoom={0.12} maxZoom={1.8} panOnScroll proOptions={{hideAttribution:true}}>
          <Background color="var(--theme-border)" gap={24} size={1} />
          <Controls showInteractive={false} />
          <Panel position="bottom-right"><div className="canvas-layout-controls"><button onClick={()=>handleResetLayout("default")} type="button">기본 정렬</button><button onClick={()=>handleResetLayout("compact")} type="button">좁은 정렬</button></div></Panel>
        </ReactFlow>
        {edgeMenu&&<div className="edge-delete-toolbar" style={{left:edgeMenu.x,top:edgeMenu.y}}><button aria-label="선택한 기능 연결선 삭제" onClick={()=>void handleDeleteEdge()} title="연결선 삭제" type="button">🗑</button></div>}
        {selectedFeature && <aside className="node-document-panel"><button className="panel-close" onClick={() => setSelectedFeatureId(undefined)} type="button">×</button><FeatureEditor key={selectedFeature.id} feature={selectedFeature} onSave={handleSaveFeature} /></aside>}
      </div>}
      <FeatureProposalPanel projectId={projectId} features={features} isOpen={isProposalPanelOpen} onClose={() => setIsProposalPanelOpen(false)} onAccepted={handleAcceptedProposal} />
    </section>
  );
}
