'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { INPUT_STYLES, TYPOGRAPHY } from '@/lib/styles/constants';

export type SortOrder = 'asc' | 'desc';

interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  value: string;
  order: SortOrder;
  onSortChange: (value: string, order: SortOrder) => void;
  options: SortOption[];
  label?: string;
  disabled?: boolean;
}

/**
 * Unified SortDropdown component for custom sorting
 * Used in reports, tables, and list views
 */
export function SortDropdown({
  value,
  order,
  onSortChange,
  options,
  label,
  disabled = false,
}: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const toggleOrder = () => {
    onSortChange(value, order === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={TYPOGRAPHY.label}>
          {label}
        </label>
      )}
      <div ref={ref} className="relative flex gap-1.5">
        {/* Sort field selector */}
        <div className="relative flex-1">
          <button
            onClick={() => setOpen(p => !p)}
            disabled={disabled}
            className={`${INPUT_STYLES.select} w-full flex items-center justify-between
              ${open ? 'border-zinc-400 dark:border-white/30 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-black text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'}`}
          >
            <span className="truncate">{selectedOption?.label || 'Chọn trường'}</span>
            <CaretDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 z-50 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-lg animate-in fade-in duration-100 max-h-48 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onSortChange(opt.value, order);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[11px] transition-colors
                    ${value === opt.value
                      ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold'
                      : 'hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort order toggle button */}
        <button
          onClick={toggleOrder}
          disabled={disabled}
          className={`flex items-center justify-center w-8 h-8 border rounded transition-colors
            ${order === 'asc'
              ? 'bg-white dark:bg-black border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
              : 'bg-white dark:bg-black border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white'}`}
          title={`Sắp xếp: ${order === 'asc' ? 'Tăng dần' : 'Giảm dần'}`}
        >
          {order === 'asc' ? (
            <CaretUp size={14} weight="bold" />
          ) : (
            <CaretDown size={14} weight="bold" />
          )}
        </button>
      </div>
    </div>
  );
}
