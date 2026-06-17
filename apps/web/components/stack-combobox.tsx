"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { STACK_OPTIONS } from "@/lib/constants";

interface StackComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

// Combobox for the form's "Stack you'll build on" field.
//
// UX rules:
// - Type → filter STACK_OPTIONS by case-insensitive prefix.
// - Enter / Tab → commit either the highlighted suggestion OR (if no
//   suggestion is highlighted, e.g. the user typed something not in the
//   list) the raw typed text. Free-text is a first-class outcome.
// - Backspace on empty input → remove the last chip.
// - Esc → close the dropdown.
// - Case-insensitive dedup so "OpenAI" and "openai" don't both land.
export function StackCombobox({
  value,
  onChange,
  placeholder = "Type to add — e.g. nextjs, convex, duckdb...",
}: StackComboboxProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set(value.map((v) => v.toLowerCase()));
    return STACK_OPTIONS.filter((opt) => !taken.has(opt.toLowerCase()))
      .filter((opt) => !q || opt.toLowerCase().startsWith(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, value]);

  // Reset the highlighted index whenever the suggestion list shrinks past it.
  useEffect(() => {
    if (highlighted >= suggestions.length) setHighlighted(0);
  }, [suggestions.length, highlighted]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function isDuplicate(candidate: string): boolean {
    return value.map((v) => v.toLowerCase()).includes(candidate.toLowerCase());
  }

  function commitValue(raw: string) {
    const next = raw.trim();
    if (!next) return;
    if (isDuplicate(next)) {
      setQuery("");
      return;
    }
    onChange([...value, next]);
    setQuery("");
    setHighlighted(0);
  }

  function commitFromInput() {
    // Prefer highlighted suggestion when one exists; otherwise raw text.
    const picked = suggestions[highlighted];
    commitValue(picked ?? query);
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) =>
        suggestions.length === 0 ? 0 : Math.min(h + 1, suggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // ALWAYS prevent the parent form from submitting on Enter while the
      // user is editing this field.
      e.preventDefault();
      commitFromInput();
    } else if (e.key === "Tab") {
      // Tab commits the highlighted suggestion if any, then advances focus
      // naturally (don't preventDefault when there's nothing to commit).
      if (suggestions[highlighted] && query.trim() !== "") {
        e.preventDefault();
        commitValue(suggestions[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2 py-1.5 transition-colors",
          "focus-within:border-brand-500 hover:border-neutral-700"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((chip, idx) => (
          <span
            key={`${chip}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full border border-brand-500/60 bg-brand-500/15 px-2 py-0.5 text-xs text-brand-200"
          >
            {chip}
            <button
              type="button"
              aria-label={`Remove ${chip}`}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(idx);
              }}
              className="cursor-pointer rounded-full text-brand-300 transition-colors hover:text-brand-100"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="stack-combobox-listbox"
          aria-activedescendant={
            open && suggestions.length > 0
              ? `stack-opt-${highlighted}`
              : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[140px] flex-1 bg-transparent py-0.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="stack-combobox-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-800 bg-neutral-950/95 py-1 shadow-2xl backdrop-blur"
        >
          {suggestions.map((opt, idx) => (
            <li
              key={opt}
              id={`stack-opt-${idx}`}
              role="option"
              aria-selected={idx === highlighted}
              onMouseEnter={() => setHighlighted(idx)}
              // mouseDown beats the input's blur, so the click lands BEFORE
              // we'd otherwise close the dropdown.
              onMouseDown={(e) => {
                e.preventDefault();
                commitValue(opt);
              }}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                idx === highlighted
                  ? "bg-brand-500/15 text-brand-100"
                  : "text-neutral-300 hover:bg-neutral-900"
              )}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {/* Hint shown only when the user has typed something not in the list */}
      {open && query.trim() !== "" && suggestions.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-950/95 px-3 py-2 text-xs text-neutral-400 shadow-xl">
          Press Enter to add{" "}
          <span className="font-medium text-brand-300">
            &ldquo;{query.trim()}&rdquo;
          </span>
        </div>
      )}
    </div>
  );
}
