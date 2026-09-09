'use client';

import { useEffect, useRef } from 'react';
import { RotateCcw, X } from 'lucide-react';

export function SessionResetDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onCancel();
    }}>
      <section className="session-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="session-reset-title">
        <header className="dialog-header">
          <div className="dialog-heading">
            <span><RotateCcw size={17} /></span>
            <div>
              <p className="eyebrow">New conversation</p>
              <h2 id="session-reset-title">대화 세션을 초기화할까요?</h2>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="초기화 취소"><X size={17} /></button>
        </header>

        <div className="session-reset-copy">
          <p>화면의 대화와 활성 Context 연결만 새로 시작합니다.</p>
          <strong>저장된 Context와 로컬 RAG 기억은 그대로 유지돼요.</strong>
        </div>

        <footer className="dialog-actions">
          <button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel}>취소</button>
          <button className="reset-confirm-button" type="button" onClick={onConfirm}>
            <RotateCcw size={15} /> 세션 초기화
          </button>
        </footer>
      </section>
    </div>
  );
}
