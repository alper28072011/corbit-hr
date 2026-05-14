import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E8E6E1]">
      <div>
        <h2 className="text-3xl font-serif font-bold text-[#2D332D]">{title}</h2>
        {description && (
          <p className="text-stone-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
