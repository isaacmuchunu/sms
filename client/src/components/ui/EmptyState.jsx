import React from 'react';
import { Package } from '@phosphor-icons/react';
import { cn } from './Button';

const EmptyState = ({ title = 'No records found', description, icon: Icon = Package, action }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center')}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
