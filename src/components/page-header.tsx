import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-card px-4 sm:px-6">
      <div className="flex-1">
        <h1 className="font-semibold text-lg">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
