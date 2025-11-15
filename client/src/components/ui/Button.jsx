import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const variants = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 border-transparent',
  secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 border-transparent',
  outline: 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300',
  ghost: 'bg-transparent text-zinc-600 border-transparent hover:bg-zinc-100',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-9 w-9 p-0 justify-center',
};

const Button = React.forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      children,
      disabled,
      isLoading,
      type = 'button',
      as: Component = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const classes = cn(
      'inline-flex items-center justify-center gap-2 rounded-lg border font-medium',
      'transition-all duration-120 ease-out-strong',
      'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      variants[variant],
      sizes[size],
      className
    );

    return (
      <Component
        ref={ref}
        type={Component === 'button' ? type : undefined}
        disabled={isDisabled}
        className={classes}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export default Button;
