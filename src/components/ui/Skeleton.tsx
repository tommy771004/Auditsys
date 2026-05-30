import React from 'react';

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-white/5 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[18px] border border-white/5 bg-slate-950/40 p-4 flex flex-col gap-3 min-h-[80px]">
      <div className="flex items-center justify-between w-full">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center justify-between w-full">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
    </div>
  );
}
