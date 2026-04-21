'use client';

import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { INPUT_STYLES, TYPOGRAPHY } from '@/lib/styles/constants';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  clearable?: boolean;
}

/**
 * Unified SearchInput component used across all admin dashboard tabs
 * Handles search with optional clear button and custom styling
 */
export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Tìm kiếm...',
  label,
  disabled = false,
  clearable = true,
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={TYPOGRAPHY.label}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <MagnifyingGlass 
          size={14} 
          className="absolute left-3 text-zinc-500 dark:text-zinc-600 pointer-events-none"
          weight="bold"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`${INPUT_STYLES.base} pl-8 pr-${clearable && value ? '8' : '3'}`}
        />
        {clearable && value && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400 transition-colors disabled:opacity-50"
            disabled={disabled}
            type="button"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
