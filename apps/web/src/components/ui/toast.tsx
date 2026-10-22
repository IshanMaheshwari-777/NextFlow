"use client";
import { create } from "zustand";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string; action?: { label: string; onClick: () => void } };

type ToastState = { items: ToastItem[]; push: (t: Omit<ToastItem, "id">, ttl?: number) => void; dismiss: (id: number) => void };

let seq = 0;
const useToastStore = create<ToastState>()((set, get) => ({
  items: [],
  push: (t, ttl = 4500) => {
    const id = ++seq;
    // Collapse exact duplicates (e.g. the same error fired by two pollers) instead of stacking them.
    const existing = get().items.find(i => i.message === t.message && i.kind === t.kind);
    if (existing) return;
    set(s => ({ items: [...s.items.slice(-3), { ...t, id }] }));
    if (ttl > 0) setTimeout(() => get().dismiss(id), ttl);
  },
  dismiss: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push({ kind: "success", message }),
  error: (message: string, action?: ToastItem["action"]) => useToastStore.getState().push({ kind: "error", message, action }, 7000),
  warning: (message: string) => useToastStore.getState().push({ kind: "warning", message }, 6000),
  info: (message: string) => useToastStore.getState().push({ kind: "info", message }),
};

const META: Record<ToastKind, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: "var(--success)" },
  error: { icon: XCircle, color: "var(--error)" },
  warning: { icon: AlertTriangle, color: "var(--warning)" },
  info: { icon: Info, color: "var(--text-secondary)" },
};

export function Toaster() {
  const { items, dismiss } = useToastStore();
  return (
    <div aria-live="polite" className="toaster">
      {items.map(t => {
        const { icon: Icon, color } = META[t.kind];
        return (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className="toast">
            <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button className="toast-action" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>
            )}
            <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}
