import * as DialogP from "@radix-ui/react-dialog";
import * as TabsP from "@radix-ui/react-tabs";
import * as TooltipP from "@radix-ui/react-tooltip";
import * as SelectP from "@radix-ui/react-select";
import * as SwitchP from "@radix-ui/react-switch";
import * as SliderP from "@radix-ui/react-slider";
import * as DropdownP from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Dialog */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogP.Root open={open} onOpenChange={onOpenChange}>
      <DialogP.Portal>
        <DialogP.Overlay className="fixed inset-0 z-[70] bg-bg/70 backdrop-blur-[2px] data-[state=open]:animate-[ticker-in_.2s]" />
        <DialogP.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[71] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-panel focus:outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <DialogP.Title className="text-sm font-semibold text-fg">{title}</DialogP.Title>
              {description && <DialogP.Description className="mt-1 text-xs leading-relaxed text-muted">{description}</DialogP.Description>}
            </div>
            <DialogP.Close className="rounded p-1 text-subtle hover:bg-hover hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </DialogP.Close>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </DialogP.Content>
      </DialogP.Portal>
    </DialogP.Root>
  );
}

/* Tabs */
export const Tabs = TabsP.Root;
export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <TabsP.List className={cn("flex items-center gap-1 border-b border-border", className)}>{children}</TabsP.List>;
}
export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsP.Trigger
      value={value}
      className="relative -mb-px flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 text-[13px] text-muted transition-colors hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg [&_svg]:size-3.5"
    >
      {children}
    </TabsP.Trigger>
  );
}
export const TabsContent = TabsP.Content;

/* Tooltip */
export function Tip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <TooltipP.Root delayDuration={250}>
      <TooltipP.Trigger asChild>{children}</TooltipP.Trigger>
      <TooltipP.Portal>
        <TooltipP.Content
          side={side}
          sideOffset={6}
          className="z-[80] max-w-xs rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-fg shadow-panel"
        >
          {content}
        </TooltipP.Content>
      </TooltipP.Portal>
    </TooltipP.Root>
  );
}
export const TooltipProvider = TooltipP.Provider;

/* Select */
export function Select({
  value,
  onValueChange,
  options,
  className,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <SelectP.Root value={value} onValueChange={onValueChange}>
      <SelectP.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-bg px-2.5 text-[13px] text-fg hover:border-border-strong focus:border-accent focus:outline-none",
          className,
        )}
      >
        <span className="truncate">
          <SelectP.Value placeholder={placeholder} />
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-subtle" />
      </SelectP.Trigger>
      <SelectP.Portal>
        <SelectP.Content position="popper" sideOffset={4} className="z-[80] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-elevated shadow-panel">
          <SelectP.Viewport className="p-1">
            {options.map((o) => (
              <SelectP.Item
                key={o.value}
                value={o.value}
                className="relative flex h-7 cursor-default select-none items-center rounded pl-7 pr-2 text-[13px] text-fg outline-none data-[highlighted]:bg-hover"
              >
                <SelectP.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-accent" />
                </SelectP.ItemIndicator>
                <SelectP.ItemText>{o.label}</SelectP.ItemText>
              </SelectP.Item>
            ))}
          </SelectP.Viewport>
        </SelectP.Content>
      </SelectP.Portal>
    </SelectP.Root>
  );
}

/* Switch */
export function Switch({ checked, onCheckedChange, id, ariaLabel }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; ariaLabel?: string }) {
  return (
    <SwitchP.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative h-5 w-9 shrink-0 rounded-full border border-border bg-elevated transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <SwitchP.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-fg" />
    </SwitchP.Root>
  );
}

/* Slider */
export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, ariaLabel }: { value: number; onValueChange: (v: number) => void; min?: number; max?: number; step?: number; ariaLabel?: string }) {
  return (
    <SliderP.Root value={[value]} onValueChange={(v) => onValueChange(v[0])} min={min} max={max} step={step} className="relative flex h-5 w-full touch-none select-none items-center">
      <SliderP.Track className="relative h-1 grow rounded-full bg-elevated">
        <SliderP.Range className="absolute h-full rounded-full bg-accent" />
      </SliderP.Track>
      <SliderP.Thumb aria-label={ariaLabel} className="block size-3.5 rounded-full border-2 border-accent bg-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" />
    </SliderP.Root>
  );
}

/* Dropdown */
export function Dropdown({ trigger, items, align = "end" }: { trigger: ReactNode; items: { label: string; icon?: ReactNode; onSelect: () => void; tone?: "critical" }[]; align?: "start" | "end" }) {
  return (
    <DropdownP.Root>
      <DropdownP.Trigger asChild>{trigger}</DropdownP.Trigger>
      <DropdownP.Portal>
        <DropdownP.Content align={align} sideOffset={4} className="z-[80] min-w-44 rounded-md border border-border bg-elevated p-1 shadow-panel">
          {items.map((it) => (
            <DropdownP.Item
              key={it.label}
              onSelect={it.onSelect}
              className={cn(
                "flex h-7 cursor-default items-center gap-2 rounded px-2 text-[13px] outline-none data-[highlighted]:bg-hover [&_svg]:size-3.5",
                it.tone === "critical" ? "text-critical" : "text-fg",
              )}
            >
              {it.icon}
              {it.label}
            </DropdownP.Item>
          ))}
        </DropdownP.Content>
      </DropdownP.Portal>
    </DropdownP.Root>
  );
}
