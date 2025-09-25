import React from 'react';
import { cn } from './Button';

const Avatar = ({ name, src, size = 'md', className }) => {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-accent-subtle font-semibold text-accent-700',
        sizes[size],
        className
      )}
    >
      {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full rounded-full object-cover" /> : initials}
    </div>
  );
};

export default Avatar;
