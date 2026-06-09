import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
};

export default function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="bg-white px-8 py-12 text-center md:px-12 md:py-16">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
        Empty State
      </p>

      <h3 className="text-2xl font-black tracking-[-0.04em] text-black">
        {title}
      </h3>

      {description && (
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#5e5e5e]">
          {description}
        </p>
      )}

      {href && actionLabel && (
        <Link
          href={href}
          className="mt-8 inline-flex bg-black px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#3b3b3b]"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}