interface Props {
  eyebrow: string;
  title: string;
  description?: string;
}

export function PageHeader({ eyebrow, title, description }: Props) {
  return (
    <div className="mb-10 border-b border-border pb-8">
      <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary mb-3">
        {eyebrow}
      </div>
      <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
