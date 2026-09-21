import type { ReactNode } from "react";

/**
 * The Studio's shared building blocks. Every panel is assembled from these
 * so a new settings section inherits the whole look for free instead of
 * hand-rolling another slightly-different card.
 */

export function PanelHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <header className="mb-6">
      <h2 className="text-lg font-bold tracking-tight text-slate-50">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-400">{blurb}</p>
    </header>
  );
}

export function Card({
  title,
  blurb,
  children,
  action,
}: {
  title?: string;
  blurb?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-100">{title}</h3>}
            {blurb && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{blurb}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-teal-500";

export function Toggle({
  label,
  blurb,
  checked,
  onChange,
}: {
  label: string;
  blurb?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-semibold text-slate-100">{label}</span>
        {blurb && <span className="block text-xs leading-relaxed text-slate-400">{blurb}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-teal-500" : "bg-slate-700"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="font-mono text-xs font-bold text-teal-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-teal-500"
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary: "bg-teal-500 text-slate-950 hover:bg-teal-400",
    ghost: "border border-slate-700 text-slate-100 hover:bg-slate-800",
    danger: "border border-rose-900/70 text-rose-300 hover:bg-rose-950/40",
  }[variant];
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-center">
      <p className="text-lg font-bold text-teal-300">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase leading-tight tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
