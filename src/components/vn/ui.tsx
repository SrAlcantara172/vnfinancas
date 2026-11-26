import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="vn-card w-full max-w-md rounded-b-none p-5 sm:rounded-b-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mb-3 block text-xs text-muted-foreground"><span className="mb-1 block">{label}</span>{children}</label>;
}
export function Btn({ children, variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "success" }) {
  const v = { primary: "bg-primary text-primary-foreground hover:bg-primary/90", ghost: "border border-border hover:bg-accent", success: "bg-success/15 text-success hover:bg-success/25" }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${v} ${p.className ?? ""}`}>{children}</button>;
}
export function CardBox({ title, sub, icon, action, children, className = "" }: { title: string; sub?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`vn-card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-semibold">{title}</h3>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
        <div className="flex shrink-0 items-center gap-2">{action}{icon && <span className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground">{icon}</span>}</div>
      </div>
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{children}</p>;
}
