'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { ContextCandidate, ContextColor, ContextGoalItem, ContextProgressTopic } from '@/lib/living-context';
import { contextColors } from '@/lib/living-context';
import { getContextColor } from '@/lib/project-theme';

export function ContextPreviewDialog({
  candidate,
  onCancel,
  onCreate,
}: {
  candidate: ContextCandidate | null;
  onCancel: () => void;
  onCreate: (candidate: ContextCandidate) => void;
}) {
  const [draft, setDraft] = useState<ContextCandidate | null>(candidate);
  const [goalText, setGoalText] = useState('');
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    setDraft(candidate);
    setGoalText(candidate?.goalItems.map((item) => item.title).join('\n') ?? '');
    setProgressText(candidate?.progressTopics.map((topic) => `${topic.title}: ${topic.summary}`).join('\n') ?? '');
  }, [candidate]);
  if (!candidate || !draft) return null;

  const selectedColor = getContextColor(draft.colorKey);
  const canCreate = Boolean(draft.title.trim() && parseLines(goalText).length && parseLines(progressText).length);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onCancel();
    }}>
      <section
        className="context-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-preview-title"
        style={{ '--context-accent': selectedColor.accent, '--context-rgb': selectedColor.rgb } as React.CSSProperties}
      >
        <header className="dialog-header">
          <div className="dialog-heading">
            <span><Sparkles size={17} /></span>
            <div>
              <p className="eyebrow">Context Preview</p>
              <h2 id="context-preview-title">AI가 발견한 이야기를 다듬어 보세요</h2>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="미리보기 닫기"><X size={17} /></button>
        </header>

        <div className="dialog-fields">
          <label>
            <span>Context name</span>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={48} autoFocus />
          </label>
          <label>
            <span>Goal checklist · 한 줄에 하나</span>
            <textarea value={goalText} onChange={(event) => setGoalText(event.target.value)} rows={4} maxLength={900} />
          </label>
          <label>
            <span>Current Progress · 주제: 진행 내용</span>
            <textarea value={progressText} onChange={(event) => setProgressText(event.target.value)} rows={5} maxLength={1400} />
          </label>
          <fieldset className="color-field">
            <legend>Accent color</legend>
            <div className="color-options">
              {contextColors.map((colorKey) => {
                const color = getContextColor(colorKey);
                return (
                  <button
                    key={colorKey}
                    type="button"
                    className={draft.colorKey === colorKey ? 'color-option selected' : 'color-option'}
                    onClick={() => setDraft({ ...draft, colorKey: colorKey as ContextColor })}
                    aria-label={`${color.label} 색상 선택`}
                    aria-pressed={draft.colorKey === colorKey}
                    style={{ '--swatch': color.accent } as React.CSSProperties}
                  >
                    <i />
                    <span>{color.label}</span>
                    {draft.colorKey === colorKey ? <Check size={13} /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>취소</button>
          <button className="accent-button" type="button" disabled={!canCreate} onClick={() => {
            const goalItems = parseGoalItems(goalText, draft.goalItems);
            const progressTopics = parseProgressTopics(progressText, draft.progressTopics);
            onCreate({
              ...draft,
              title: draft.title.trim(),
              goal: goalItems.map((item) => item.title).join(' · '),
              currentState: progressTopics.map((topic) => `${topic.title}: ${topic.summary}`).join(' · '),
              goalItems,
              progressTopics,
            });
          }}>
            Context 만들기 <Sparkles size={15} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function parseLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseGoalItems(value: string, current: ContextGoalItem[]) {
  const now = new Date().toISOString();
  return parseLines(value).map((title) => {
    const existing = current.find((item) => normalize(item.title) === normalize(title));
    return existing ? { ...existing, title } : {
      id: makeId('goal'),
      title,
      completed: false,
      createdAt: now,
    };
  });
}

function parseProgressTopics(value: string, current: ContextProgressTopic[]) {
  const now = new Date().toISOString();
  return parseLines(value).map((line) => {
    const separator = line.indexOf(':');
    const title = (separator >= 0 ? line.slice(0, separator) : line).trim();
    const summary = (separator >= 0 ? line.slice(separator + 1) : '진행 상황을 다음 대화에서 구체화할 예정').trim();
    const existing = current.find((topic) => normalize(topic.title) === normalize(title));
    return {
      id: existing?.id ?? makeId('progress'),
      title,
      summary,
      status: existing?.status ?? 'in_progress',
      updatedAt: now,
    } satisfies ContextProgressTopic;
  });
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
