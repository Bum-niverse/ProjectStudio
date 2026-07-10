import { useState } from "react";
import type { PrdRevision } from "./domain/project";

interface PrdEditorProps {
  revision: PrdRevision;
  onSave: (contentMarkdown: string) => Promise<void>;
}

export function PrdEditor({ revision, onSave }: PrdEditorProps) {
  const [content, setContent] = useState(revision.contentMarkdown);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const hasChanges = content !== revision.contentMarkdown;

  async function handleSave() {
    setIsSaving(true);
    setMessage(undefined);
    try {
      await onSave(content);
      setMessage("새 PRD 리비전을 저장했습니다.");
    } catch {
      setMessage("PRD를 저장하지 못했습니다. 내용을 유지했으니 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="prd-editor">
      <textarea
        aria-label="PRD 내용"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={16}
      />
      <div className="editor-actions">
        {message && <p aria-live="polite">{message}</p>}
        <button type="button" disabled={!hasChanges || isSaving} onClick={handleSave}>
          {isSaving ? "저장 중…" : "새 리비전 저장"}
        </button>
      </div>
    </div>
  );
}
