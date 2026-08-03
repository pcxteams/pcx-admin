'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Loader2 } from 'lucide-react';

export interface AsyncOption {
  id: string;
  label: string;
}

interface AsyncSearchableSelectProps {
  value: string;
  selectedLabel?: string;
  onChange: (id: string, label: string) => void;
  fetchOptions: (query: string) => Promise<AsyncOption[]>;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  debounceMs?: number;
}

/**
 * Like SearchableSelect, but never preloads the full option list — every
 * open and keystroke triggers a fresh (debounced) server-side search via
 * fetchOptions. Used where the backing set can be large (e.g. every
 * workspace on the platform), unlike SearchableSelect's eager client-side
 * filtering over a small preloaded list.
 */
export default function AsyncSearchableSelect({
  value,
  selectedLabel,
  onChange,
  fetchOptions,
  placeholder = 'Select…',
  disabled = false,
  clearable = false,
  debounceMs = 300,
}: AsyncSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AsyncOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const runSearch = useCallback(
    (q: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      fetchOptions(q)
        .then((results) => {
          if (requestId === requestIdRef.current) setOptions(results);
        })
        .catch(() => {
          if (requestId === requestIdRef.current) setOptions([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    },
    [fetchOptions],
  );

  function handleToggle() {
    if (disabled) return;
    const next = !open;
    setOpen(next);
    if (next) runSearch(query);
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), debounceMs);
  }

  function handleSelect(option: AsyncOption) {
    onChange(option.id, option.label);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? (selectedLabel ?? value) : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {clearable && value && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange('', '');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={15} className="text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Type to search…"
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-gray-400 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" /> Searching…
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : (
              options.map((option) => (
                <li
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                    option.id === value ? 'text-teal-600 font-medium' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
