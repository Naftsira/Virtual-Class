import AuthVisualPanel from '@/components/AuthVisualPanel';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f9f9f9] text-[#1a1c1c] selection:bg-black selection:text-white md:flex md:h-dvh md:overflow-hidden">
      <AuthVisualPanel />

      <section className="w-full flex-1 overflow-y-auto bg-[#f9f9f9] px-6 sm:px-8 md:h-dvh md:w-1/2 md:px-16 lg:w-2/5 lg:px-24">
        <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center py-10 md:min-h-full md:py-12">
          {children}
        </div>
      </section>
    </main>
  );
}