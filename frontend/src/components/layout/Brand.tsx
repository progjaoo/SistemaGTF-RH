export function Brand({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 items-center justify-start gap-3">{children}</div>;
}

export function BrandLogo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={`block h-[58px] w-[120px] max-w-full object-contain transition-[width,height] ${className ?? ""}`}
    />
  );
}

export function BrandText({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 overflow-hidden whitespace-nowrap">{children}</div>;
}

export function BrandMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-12 w-12 place-items-center rounded-lg bg-teal font-black text-white">
      {children}
    </div>
  );
}
