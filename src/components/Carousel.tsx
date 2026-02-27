import { ReactNode } from 'react';

interface CarouselProps {
  title: string;
  children: ReactNode;
}

export default function Carousel({ title, children }: CarouselProps) {
  return (
    <section className="py-8 pl-4 sm:pl-8">
      <div className="flex justify-between items-end mb-6 pr-4 sm:pr-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
        <button className="text-sm font-semibold text-emerald-600 hover:underline">View all</button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
        {children}
        <div className="min-w-[1px] pr-4 sm:pr-8" /> {/* Spacer for end padding */}
      </div>
    </section>
  );
}
