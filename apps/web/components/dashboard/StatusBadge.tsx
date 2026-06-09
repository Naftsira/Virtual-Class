type StatusVariant = 'neutral' | 'inverse' | 'warning' | 'danger' | 'success';

const variants: Record<StatusVariant, string> = {
  neutral: 'bg-[#eeeeee] text-[#474747]',
  inverse: 'bg-black text-white',
  warning: 'bg-[#d6d4d3] text-black',
  danger: 'bg-[#ffdad6] text-[#410002]',
  success: 'bg-[#e2e2e2] text-black',
};

export default function StatusBadge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode;
  variant?: StatusVariant;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${variants[variant]}`}
    >
      {children}
    </span>
  );
}