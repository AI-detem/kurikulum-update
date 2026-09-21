"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { CATEGORY_KEYS, categoryLabel } from "@/lib/annotations";
import type { Mark } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Kartička jednoho označeného místa v pravém panelu.
export function MarkCard({
  mark,
  number,
  editable,
  editing,
  dimmed,
  t,
  onHover,
  onSelect,
  onEdit,
  onDelete,
  onSubmit,
  onCancel,
}: {
  mark: Mark;
  number: number;
  editable: boolean;
  editing: boolean;
  dimmed: boolean;
  t: Dictionary;
  onHover: (id: string | null) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: (note: string, category: string | null) => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <MarkEditor
        mark={mark}
        number={number}
        t={t}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
  }

  const label = categoryLabel(mark.category, t);

  return (
    <div
      onMouseEnter={() => onHover(mark.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border border-haze p-3 transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-semibold text-white">
          {number}
        </span>
        <p className="flex-1 text-sm text-ink">{mark.note}</p>

        {editable && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label={t.edit}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="text-ink/40 hover:text-ink"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label={t.delete}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="text-ink/40 hover:text-coral"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {label && <span className="badge-pill mt-2">{label}</span>}
    </div>
  );
}

// Formulář pro popis značky. Bez popisu se značka neuloží.
function MarkEditor({
  mark,
  number,
  t,
  onSubmit,
  onCancel,
}: {
  mark: Mark;
  number: number;
  t: Dictionary;
  onSubmit: (note: string, category: string | null) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(mark.note);
  const [category, setCategory] = useState<string | null>(mark.category);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (note.trim()) onSubmit(note.trim(), category);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
      className="rounded-xl border border-coral p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-semibold text-white">
          {number}
        </span>
        <span className="text-sm font-medium text-ink">{t.whatChangedHere}</span>
      </div>

      <textarea
        ref={inputRef}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        className="input w-full"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(category === key ? null : key)}
            className={`badge-pill ${category === key ? "bg-coral text-white" : ""}`}
          >
            {categoryLabel(key, t)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={!note.trim()}
          className="rounded-xl bg-coral px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {t.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-sm text-ink/60 hover:bg-haze"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
