type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            {eyebrow}
          </p>
        )}

        <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.055em] text-black sm:text-5xl lg:text-6xl">
          {title}
        </h2>

        {description && (
          <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[#5e5e5e]">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}