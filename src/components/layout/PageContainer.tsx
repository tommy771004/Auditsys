import type { PropsWithChildren } from "react";

interface PageContainerProps extends PropsWithChildren {
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return <div className={["mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className].filter(Boolean).join(" ")}>{children}</div>;
}
