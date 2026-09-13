'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, ChevronDown, ChevronRight, Pencil, Loader2,
  GripVertical, Check, Trash2,
} from 'lucide-react';
import {
  topicsApiBase, contentApiBase, contentItemPath, sectionCountLabel,
  requirementLabel, STEP_TYPE_META, STEP_STATUS_META, CAREER_BUILDER_STEP_TYPES,
  type CareerBuilderScope, type CareerBuilderStepType, type TopicDetail,
  type Section, type StepSummary, type StepDetail, type Topic,
} from '@/lib/career-builder';
import TopicFormModal from './TopicFormModal';
import SectionFormModal from './SectionFormModal';
import StepFormModal from './StepFormModal';
import { TopicIcon } from './TopicIcon';

type StepModalState =
  | { mode: 'create'; sectionId: string; type: CareerBuilderStepType }
  | { mode: 'edit'; sectionId: string; step: StepDetail }
  | null;

type SectionModalState = { mode: 'create' } | { mode: 'edit'; section: Section } | null;

export default function TopicDetailView({
  scope, topicId, backHref, backLabel,
}: {
  scope: CareerBuilderScope;
  topicId: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addStepMenuFor, setAddStepMenuFor] = useState<string | null>(null);
  const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);
  const [stepModal, setStepModal] = useState<StepModalState>(null);
  const [sectionModal, setSectionModal] = useState<SectionModalState>(null);
  const [topicEditOpen, setTopicEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragStep, setDragStep] = useState<{ sectionId: string; stepId: string } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${topicsApiBase(scope)}/${topicId}`, { credentials: 'include', signal });
        if (!res.ok) {
          setError('This topic could not be loaded. It may not exist, or you may not have access to it.');
          return;
        }
        const data = (await res.json()) as TopicDetail;
        setTopic(data);
        setExpanded((prev) => (prev.size === 0 && data.sections.length > 0 ? new Set([data.sections[0].id]) : prev));
      } catch {
        if (!signal?.aborted) setError('Network error. Please check your connection.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [scope, topicId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  function toggleExpand(sectionId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  /* --------------------------------------------------------- step edit */

  async function openEditStep(sectionId: string, stepId: string) {
    setBusy(true);
    try {
      const res = await fetch(contentItemPath(scope, stepId), { credentials: 'include' });
      if (res.ok) {
        const step = (await res.json()) as StepDetail;
        setStepModal({ mode: 'edit', sectionId, step });
      }
    } finally {
      setBusy(false);
    }
  }

  function onStepSaved() {
    setStepModal(null);
    void load();
  }

  function onStepDeleted() {
    setStepModal(null);
    void load();
  }

  async function changeStatus(stepId: string, status: string) {
    setStatusMenuFor(null);
    const res = await fetch(`${contentItemPath(scope, stepId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (res.ok) void load();
  }

  /* ------------------------------------------------------------ section */

  function onSectionSaved() {
    setSectionModal(null);
    void load();
  }

  async function deleteSection(section: Section) {
    if (!window.confirm(`Delete "${section.title}" and all ${section.steps.length} of its steps? This can't be undone.`)) return;
    const res = await fetch(`${topicsApiBase(scope)}/${topicId}/sections/${section.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) void load();
  }

  /* -------------------------------------------------------------- topic */

  function onTopicSaved(saved: Topic) {
    setTopicEditOpen(false);
    setTopic((prev) => (prev ? { ...prev, ...saved } : prev));
  }

  async function deleteTopic() {
    if (!topic) return;
    if (!window.confirm(`Delete "${topic.title}" and everything in it? This can't be undone.`)) return;
    const res = await fetch(`${topicsApiBase(scope)}/${topicId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) router.push(backHref);
  }

  /* ------------------------------------------------------------ reorder */

  async function reorderSections(fromId: string, toId: string) {
    if (!topic || fromId === toId) return;
    const ids = topic.sections.map((s) => s.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from === -1 || to === -1) return;
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, fromId);

    const previous = topic;
    setTopic({ ...topic, sections: reordered.map((id) => topic.sections.find((s) => s.id === id)!) });

    const res = await fetch(`${topicsApiBase(scope)}/${topicId}/sections/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderedIds: reordered }),
    });
    if (!res.ok) setTopic(previous);
  }

  async function reorderSteps(sectionId: string, fromId: string, toId: string) {
    if (!topic || fromId === toId) return;
    const section = topic.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const ids = section.steps.map((s) => s.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from === -1 || to === -1) return;
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, fromId);

    const previous = topic;
    setTopic({
      ...topic,
      sections: topic.sections.map((s) =>
        s.id === sectionId ? { ...s, steps: reordered.map((id) => s.steps.find((x) => x.id === id)!) } : s,
      ),
    });

    const res = await fetch(`${contentApiBase(scope)}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sectionId, orderedIds: reordered }),
    });
    if (!res.ok) setTopic(previous);
  }

  /* -------------------------------------------------------------- render */

  if (loading && !topic) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto flex items-center gap-2 text-sm text-gray-400">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft size={13} /> {backLabel}
        </Link>
        <div className="rounded-xl border border-gray-100 bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">{error ?? 'Topic not found.'}</p>
        </div>
      </div>
    );
  }

  const totalSteps = topic.sections.reduce((n, s) => n + s.steps.length, 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={13} /> {backLabel}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-slate-100 text-slate-600 shrink-0">
            <TopicIcon icon={topic.icon} size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{topic.title}</h1>
              <button type="button" onClick={() => setTopicEditOpen(true)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                <Pencil size={14} />
              </button>
            </div>
            {topic.description && <p className="text-sm text-gray-400 mt-0.5">{topic.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400">{sectionCountLabel(topic.sections.length, totalSteps)}</span>
          <button
            type="button"
            onClick={() => setSectionModal({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <Plus size={15} />
            Add Section
          </button>
          <button
            type="button"
            onClick={deleteTopic}
            className="text-gray-300 hover:text-red-500 cursor-pointer"
            aria-label="Delete topic"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-100">
        {topic.sections.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">
            No sections yet. Use &ldquo;Add Section&rdquo; to create the first one.
          </div>
        ) : (
          topic.sections.map((section, i) => (
            <SectionBlock
              key={section.id}
              index={i + 1}
              section={section}
              expandedRow={expanded.has(section.id)}
              onToggle={() => toggleExpand(section.id)}
              onEdit={() => setSectionModal({ mode: 'edit', section })}
              onDelete={() => deleteSection(section)}
              addStepMenuOpen={addStepMenuFor === section.id}
              onToggleAddStepMenu={() => setAddStepMenuFor(addStepMenuFor === section.id ? null : section.id)}
              onAddStep={(type) => {
                setAddStepMenuFor(null);
                setStepModal({ mode: 'create', sectionId: section.id, type });
              }}
              onEditStep={(stepId) => openEditStep(section.id, stepId)}
              statusMenuFor={statusMenuFor}
              onToggleStatusMenu={(stepId) => setStatusMenuFor(statusMenuFor === stepId ? null : stepId)}
              onChangeStatus={changeStatus}
              dragging={dragSectionId === section.id}
              onDragStart={() => setDragSectionId(section.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragSectionId) reorderSections(dragSectionId, section.id);
                setDragSectionId(null);
              }}
              dragStepId={dragStep?.sectionId === section.id ? dragStep.stepId : null}
              onStepDragStart={(stepId) => setDragStep({ sectionId: section.id, stepId })}
              onStepDrop={(stepId) => {
                if (dragStep && dragStep.sectionId === section.id) reorderSteps(section.id, dragStep.stepId, stepId);
                setDragStep(null);
              }}
              busy={busy}
            />
          ))
        )}

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => setSectionModal({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 cursor-pointer"
          >
            <Plus size={14} />
            Add Section
          </button>
        </div>
      </div>

      {topicEditOpen && (
        <TopicFormModal scope={scope} mode="edit" topic={topic} onClose={() => setTopicEditOpen(false)} onSaved={onTopicSaved} />
      )}

      {sectionModal && (
        <SectionFormModal
          scope={scope}
          topicId={topicId}
          mode={sectionModal.mode}
          section={sectionModal.mode === 'edit' ? sectionModal.section : undefined}
          onClose={() => setSectionModal(null)}
          onSaved={onSectionSaved}
        />
      )}

      {stepModal && (
        <StepFormModal
          scope={scope}
          mode={stepModal.mode}
          type={stepModal.mode === 'create' ? stepModal.type : (stepModal.step.type as CareerBuilderStepType)}
          sectionId={stepModal.sectionId}
          step={stepModal.mode === 'edit' ? stepModal.step : undefined}
          onClose={() => setStepModal(null)}
          onSaved={onStepSaved}
          onDeleted={onStepDeleted}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- section */

function SectionBlock({
  index, section, expandedRow, onToggle, onEdit, onDelete,
  addStepMenuOpen, onToggleAddStepMenu, onAddStep, onEditStep,
  statusMenuFor, onToggleStatusMenu, onChangeStatus,
  dragging, onDragStart, onDragOver, onDrop,
  dragStepId, onStepDragStart, onStepDrop, busy,
}: {
  index: number;
  section: Section;
  expandedRow: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  addStepMenuOpen: boolean;
  onToggleAddStepMenu: () => void;
  onAddStep: (type: CareerBuilderStepType) => void;
  onEditStep: (stepId: string) => void;
  statusMenuFor: string | null;
  onToggleStatusMenu: (stepId: string) => void;
  onChangeStatus: (stepId: string, status: string) => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragStepId: string | null;
  onStepDragStart: (stepId: string) => void;
  onStepDrop: (stepId: string) => void;
  busy: boolean;
}) {
  return (
    <div className={dragging ? 'opacity-40' : ''}>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50/60 transition-colors"
      >
        <GripVertical size={14} className="text-gray-200 cursor-grab shrink-0" />
        <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0">
          {expandedRow ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button type="button" onClick={onToggle} className="flex-1 text-left text-sm font-semibold text-gray-900 cursor-pointer">
          {index}. {section.title}
        </button>
        <button type="button" onClick={onEdit} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">
          <Pencil size={13} />
        </button>
        <span className="text-xs text-gray-400 shrink-0">
          {section.steps.length} Step{section.steps.length === 1 ? '' : 's'}
        </span>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {expandedRow && (
        <div className="border-t border-gray-50 bg-gray-50/40">
          {section.steps.length > 0 && (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase w-8" />
                  <th className="px-2 py-2 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Step</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Requirement</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {section.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    onEdit={() => onEditStep(step.id)}
                    statusMenuOpen={statusMenuFor === step.id}
                    onToggleStatusMenu={() => onToggleStatusMenu(step.id)}
                    onChangeStatus={(s) => onChangeStatus(step.id, s)}
                    dragging={dragStepId === step.id}
                    onDragStart={() => onStepDragStart(step.id)}
                    onDrop={() => onStepDrop(step.id)}
                  />
                ))}
              </tbody>
            </table>
          )}

          <div className="px-4 py-2.5 relative">
            <button
              type="button"
              onClick={onToggleAddStepMenu}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={14} />
              Add Step
            </button>

            {addStepMenuOpen && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
                {CAREER_BUILDER_STEP_TYPES.map((t) => {
                  const meta = STEP_TYPE_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onAddStep(t)}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-4 hover:border-teal-400 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <meta.Icon size={18} className={meta.iconColor} />
                      <span className="text-xs font-semibold text-gray-800">{meta.label}</span>
                      <span className="text-[10px] text-gray-400 text-center leading-tight">{meta.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ step */

function StepRow({
  step, onEdit, statusMenuOpen, onToggleStatusMenu, onChangeStatus, dragging, onDragStart, onDrop,
}: {
  step: StepSummary;
  onEdit: () => void;
  statusMenuOpen: boolean;
  onToggleStatusMenu: () => void;
  onChangeStatus: (status: string) => void;
  dragging: boolean;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const meta = STEP_TYPE_META[step.type as CareerBuilderStepType];
  return (
    <tr
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`hover:bg-white transition-colors ${dragging ? 'opacity-40' : ''}`}
    >
      <td className="px-4 py-2.5">
        <GripVertical size={13} className="text-gray-200 cursor-grab" />
      </td>
      <td className="px-2 py-2.5">
        <button type="button" onClick={onEdit} className="text-sm font-medium text-gray-800 hover:text-teal-700 cursor-pointer text-left">
          {step.title}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1.5 ${meta?.badge ?? 'bg-gray-100 text-gray-500'}`}>
          {meta?.label ?? step.type}
        </span>
        <span className={step.assignmentStatus === 'required' ? 'text-xs text-red-500 font-medium' : 'text-xs text-gray-400'}>
          {requirementLabel(step.assignmentStatus)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <StepStatusControl
          status={step.status}
          open={statusMenuOpen}
          onToggle={onToggleStatusMenu}
          onClose={() => onToggleStatusMenu()}
          onChange={onChangeStatus}
        />
      </td>
    </tr>
  );
}

function StepStatusControl({
  status, open, onToggle, onClose, onChange,
}: {
  status: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (s: string) => void;
}) {
  const meta = STEP_STATUS_META[status] ?? STEP_STATUS_META.draft;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meta.cls} hover:opacity-80 cursor-pointer`}
      >
        {meta.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
          <div className="absolute left-0 mt-1 z-50 w-36 rounded-lg border border-gray-100 bg-white p-1 shadow-xl">
            {(['active', 'draft', 'archive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${STEP_STATUS_META[s].cls}`}>
                  {STEP_STATUS_META[s].label}
                </span>
                {s === status && <Check size={13} className="text-teal-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
