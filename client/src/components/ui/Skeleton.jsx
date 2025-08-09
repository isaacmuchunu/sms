import React from 'react';
import { cn } from './Button';

const Skeleton = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200',
        'bg-[length:200%_100%]',
        className
      )}
    />
  );
};

export default Skeleton;
