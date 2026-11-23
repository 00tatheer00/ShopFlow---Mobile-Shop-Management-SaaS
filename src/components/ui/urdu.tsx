import type { ReactNode } from 'react';

/** Urdu text in Nastaliq, right-to-left, correctly tagged for screen readers. */
export function Ur({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    // text-left: when stacked under an English label, line up with it instead of
    // drifting to the far right edge (RTL default).
    <span lang="ur" dir="rtl" className={`font-urdu text-left ${className}`}>
      {children}
    </span>
  );
}

/** English label with its Urdu meaning underneath (or beside, when inline). */
export function BiLabel({
  en,
  ur,
  inline = false,
  className = '',
  urClassName = '',
}: {
  en: ReactNode;
  ur: ReactNode;
  inline?: boolean;
  className?: string;
  urClassName?: string;
}) {
  if (inline) {
    return (
      <span className={`inline-flex items-baseline gap-2 ${className}`}>
        <span>{en}</span>
        <Ur className={`text-[0.85em] opacity-80 ${urClassName}`}>{ur}</Ur>
      </span>
    );
  }
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span>{en}</span>
      <Ur className={`text-[0.8em] opacity-80 -mt-0.5 ${urClassName}`}>{ur}</Ur>
    </span>
  );
}
