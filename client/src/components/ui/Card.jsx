import React from 'react';
import { cn } from './Button';

const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-zinc-200 bg-white shadow-card',
        'transition-shadow duration-160 ease-out-strong',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ className, children }) => (
  <div className={cn('flex items-center justify-between border-b border-zinc-100 px-5 py-4', className)}>
    {children}
  </div>
);

export const CardTitle = ({ className, children }) => (
  <h3 className={cn('text-base font-semibold text-zinc-900', className)}>{children}</h3>
);

export const CardContent = ({ className, children }) => (
  <div className={cn('p-5', className)}>{children}</div>
);

export default Card;
