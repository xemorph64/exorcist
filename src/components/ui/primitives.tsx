import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "healthy" | "warning" | "critical" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-elevated text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent/25",
  healthy: "bg-healthy-soft text-healthy border-healthy/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  critical: "bg-critical-soft text-critical border-critical/25",
  info: "bg-info-soft text-info border-info/25",
};

export const toneText: Record<Tone, string> = {
  neutral: "text-muted",
  accent: "text-accent",
  healthy: "text-healthy",
  warning: "text-warning",
  critical: "text-critical",
  info: "text-info",
};

export const toneBg: Record<Tone, string> = {
  neutral: "bg-subtle",
  accent: "bg-accent",
  healthy: "bg-healthy",
  warning: "bg-warning",
  critical: "bg-critical",
  info: "bg-info",
};

export const toneVar: Record<Tone, string> = {
  neutral: "var(--subtle)",
  accent: "var(--accent)",
  healthy: "var(--healthy)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  info: "var(--info)",
};

export function Badge({ tone = "neutral", className, children, ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-[11px] font-medium leading-none [&_svg]:size-3",
        toneClasses[tone],
        className,
      )}
      {...p}
    >
      {children}
    </span>
  );
}

export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn("rounded-[14px] border border-border bg-surface shadow-panel", className)} {...p} />
));
Panel.displayName = "Panel";

export function PanelHeader({
  title,
  description,
  actions,
  className,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-12 items-center justify-between gap-3 px-4 pb-2 pt-3.5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-subtle [&_svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium tracking-[-0.005em] text-fg">{title}</h3>
          {description && <p className="truncate text-xs text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg placeholder:text-subtle transition-colors hover:border-border-strong focus:border-accent focus:outline-none",
      className,
    )}
    {...p}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-border bg-bg px-2.5 py-2 text-[13px] text-fg placeholder:text-subtle transition-colors hover:border-border-strong focus:border-accent focus:outline-none",
      className,
    )}
    {...p}
  />
));
Textarea.displayName = "Textarea";

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-xs font-medium text-muted", className)}>
      {children}
    </label>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 grid size-10 place-items-center rounded-lg border border-border bg-elevated text-subtle [&_svg]:size-4">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {body && <p className="max-w-sm text-xs leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted">{children}</kbd>;
}

export function SimTag({ className, label = "Simulated" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1 rounded-full border border-border px-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted [&_svg]:size-3 [&_svg]:text-accent", className)}
      title="This data is produced by the EXORCIST demo simulator, not a live system."
    >
      <FlaskConical /> {label}
    </span>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] tabular", className)}>{children}</span>;
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-elevated", className)} />;
}
