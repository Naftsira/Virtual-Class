'use client';

import dynamic from 'next/dynamic';

const AuthVisualScene = dynamic(
  () => import('@/components/AuthVisualScene'),
  { ssr: false }
);

export default function AuthVisualPanel() {
  return (
    <>
      {/* Mobile Visual Header */}
      <section className="relative overflow-hidden bg-[#2f3131] px-6 pb-6 pt-8 text-white md:hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,_#5e5e5e_0%,_#2f3131_45%,_#111111_100%)]" />
        <div className="absolute inset-0 z-[1] bg-black/20" />

        <div className="relative z-10">
          <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.35em] text-[#e2e2e2]">
            Institutional Standard
          </span>

          <h1 className="text-4xl font-black leading-none tracking-tighter">
            Lectra
          </h1>
        </div>
      </section>

      {/* Desktop Visual */}
      <section className="relative hidden shrink-0 items-center justify-center overflow-hidden bg-[#2f3131] p-12 md:flex md:h-dvh md:w-1/2 lg:w-3/5">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#5e5e5e_0%,_#343636_45%,_#171717_100%)]" />

        <AuthVisualScene />

        <div className="absolute inset-0 z-[1] bg-black/10" />

        <div className="absolute inset-y-0 left-0 z-[2] w-[75%] bg-[linear-gradient(to_right,_rgba(0,0,0,0.42),_rgba(0,0,0,0.12),_transparent)]" />

        <div className="absolute inset-x-0 bottom-0 z-[2] h-1/2 bg-[linear-gradient(to_top,_rgba(0,0,0,0.35),_transparent)]" />

        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-12">
            <span className="mb-4 block text-xs font-bold uppercase tracking-[0.4em] text-[#e2e2e2]">
              Institutional Standard
            </span>

            <h1 className="mb-6 text-6xl font-black leading-none tracking-tighter text-white lg:text-8xl">
              Lectra
            </h1>

            <p className="max-w-md text-lg font-light leading-relaxed text-[#e2e2e2]/80">
              A focused classroom workspace designed for clarity, precision,
              and structured digital learning.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div>
              <span className="block text-2xl font-bold text-white">
                Live
              </span>
              <span className="text-xs uppercase tracking-widest text-[#e2e2e2]/60">
                Classroom Session
              </span>
            </div>

            <div>
              <span className="block text-2xl font-bold text-white">
                Secure
              </span>
              <span className="text-xs uppercase tracking-widest text-[#e2e2e2]/60">
                Account Access
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 right-12 z-10 flex items-center gap-4 text-white/40">
          <span className="text-[10px] font-medium uppercase tracking-widest">
            Session ID: LCT-2941-X
          </span>
          <div className="h-px w-12 bg-white/20" />
        </div>
      </section>
    </>
  );
}