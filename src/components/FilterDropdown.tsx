'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Value that means "no filter applied". Defaults to 'all'. */
  allValue?: string;
}

/**
 * Button-style single-select filter (button showing the filter name, or
 * "Label: Selection" once a non-default value is chosen) rather than a
 * native <select> — matches the Figma's pill filter bar. Purely a controlled
 * component: whether choosing an option actually affects a query is entirely
 * up to the caller.
 */
export default function FilterDropdown({
  label,
  options,
  value,
  onChange,
  allValue = 'all',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const selected = options.find((o) => o.value === value);
  const isFiltered = value !== allValue && Boolean(selected);
  const displayLabel = isFiltered ? `${label}: ${selected!.label}` : label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 whitespace-nowrap ${
          isFiltered ? 'border-teal-200 text-teal-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
        }`}
      >
        {displayLabel}
        <ChevronDown size={13} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                option.value === value ? 'text-teal-600 font-medium' : 'text-gray-900'
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
