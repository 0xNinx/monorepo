"use client";

interface SkipLinkProps {
  href?: string;
}

export default function SkipLink({ href = "#main-content" }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:flex focus:h-auto focus:w-auto focus:items-center focus:gap-2 focus:border-3 focus:border-foreground focus:bg-background focus:p-4 focus:font-mono focus:text-sm focus:font-bold focus:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
    >
      Skip to main content
    </a>
  );
}
