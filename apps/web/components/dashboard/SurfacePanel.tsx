type SurfaceTone = 'lowest' | 'low' | 'mid' | 'inverse' | 'transparent';

const tones: Record<SurfaceTone, string> = {
  lowest: 'bg-white text-[#1a1c1c]',
  low: 'bg-[#f3f3f3] text-[#1a1c1c]',
  mid: 'bg-[#eeeeee] text-[#1a1c1c]',
  inverse: 'bg-[#2f3131] text-[#e2e2e2]',
  transparent: 'bg-transparent text-[#1a1c1c]',
};

export default function SurfacePanel({
  children,
  tone = 'lowest',
  className = '',
}: {
  children: React.ReactNode;
  tone?: SurfaceTone;
  className?: string;
}) {
  return (
    <section className={`${tones[tone]} px-6 py-6 md:px-8 md:py-8 ${className}`}>
      {children}
    </section>
  );
}