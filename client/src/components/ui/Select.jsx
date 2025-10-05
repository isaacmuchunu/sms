import React from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from './Button';

const Select = React.forwardRef(
  ({ className, label, error, helper, options = [], placeholder, id, startIcon, ...props }, ref) => {
    const selectId = id || React.useId();
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {startIcon}
            </span>
          )}
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border bg-white text-sm text-zinc-900',
              'transition-colors duration-160 ease-out-strong',
              'focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20',
              error
                ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-zinc-200 hover:border-zinc-300',
              startIcon ? 'pl-10 pr-3' : 'px-3'
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CaretDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {helper && !error && <p className="text-xs text-zinc-500">{helper}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
