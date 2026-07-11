import { useEffect } from "react";

/** Closes a modal/overlay on Escape. Pass `active=false` (or omit while closed) to skip attaching the listener. */
export function useEscapeClose(onClose: () => void, active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onClose]);
}
