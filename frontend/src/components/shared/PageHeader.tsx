type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-balance md:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
    </div>
  );
}
