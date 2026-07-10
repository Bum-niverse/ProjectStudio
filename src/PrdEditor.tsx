import { useMemo, useRef, useState } from "react";
import type { PrdRevision } from "./domain/project";
import { parsePrdMarkdown, PRD_SECTIONS, prdCompletion, serializePrdMarkdown, type PrdBlockValues } from "./domain/prdBlocks";

interface PrdEditorProps { revision:PrdRevision; fallbackValues?:PrdBlockValues; onSave:(contentMarkdown:string)=>Promise<void> }

export function PrdEditor({revision,fallbackValues={},onSave}:PrdEditorProps){
  const stored=useMemo(()=>parsePrdMarkdown(revision.contentMarkdown),[revision.contentMarkdown]);
  const initial=useMemo(()=>({...fallbackValues,...stored}),[fallbackValues,stored]);
  const[values,setValues]=useState<PrdBlockValues>(initial);const[isSaving,setIsSaving]=useState(false);const[message,setMessage]=useState<string>();
  const sectionRefs=useRef<Record<string,HTMLElement|null>>({});
  const title=revision.contentMarkdown.match(/^#\s+(.+)$/m)?.[1]??"제품 PRD";const content=serializePrdMarkdown(title,values);const hasChanges=content.trim()!==serializePrdMarkdown(title,stored).trim();const completion=prdCompletion(values);
  function update(id:string,value:string){setValues(current=>({...current,[id]:value}));}
  function moveTo(id:string){sectionRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"start"});}
  async function save(){setIsSaving(true);setMessage(undefined);try{await onSave(content);setMessage("새 PRD 리비전을 저장했습니다.");}catch{setMessage("PRD를 저장하지 못했습니다. 내용을 유지했으니 다시 시도해 주세요.");}finally{setIsSaving(false);}}
  return <div className="prd-block-editor">
    <aside className="prd-block-nav"><div className="prd-progress"><strong>PRD</strong><span><i style={{width:`${completion}%`}}/></span><small>{completion}%</small></div><nav>{PRD_SECTIONS.map(section=><button key={section.id} onClick={()=>moveTo(section.id)} type="button"><span>{section.icon}</span>{section.title}</button>)}</nav></aside>
    <div className="prd-block-content">{PRD_SECTIONS.map(section=><section className="prd-block" key={section.id} ref={element=>{sectionRefs.current[section.id]=element;}}><header><span>{section.icon}</span><div><h3>{section.title}</h3><p>{section.description}</p></div></header><div className="prd-block-fields">{section.fields.map(field=><label key={field.id}><strong>{field.title}</strong><textarea aria-label={field.title} value={values[field.id]??""} onChange={event=>update(field.id,event.target.value)} placeholder={field.placeholder} rows={Math.max(2,Math.min(7,(values[field.id]?.split("\n").length??1)+1))}/></label>)}</div></section>)}<div className="editor-actions prd-save-bar">{message&&<p aria-live="polite">{message}</p>}<button disabled={!hasChanges||isSaving} onClick={()=>void save()} type="button">{isSaving?"저장 중…":"새 리비전 저장"}</button></div></div>
  </div>;
}
