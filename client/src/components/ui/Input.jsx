import React from 'react';
import { cn } from './Button';

const Input = React.forwardRef(
  ({ className, label, error, helper, id, startIcon, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-lg border bg-white text-sm text-zinc-900',
              'placeholder:text-zinc-400',
              'transition-colors duration-160 ease-out-strong',
              'focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20',
              error
                ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-zinc-200 hover:border-zinc-300',
              startIcon ? 'pl-10 pr-3' : 'px-3'
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {helper && !error && <p className="text-xs text-zinc-500">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
