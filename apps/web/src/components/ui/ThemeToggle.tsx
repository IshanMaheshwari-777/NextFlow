"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  // Server can't know the persisted theme; correct the icon once after mount rather
  // than risk a hydration mismatch by reading `document` during the first render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsDark(!document.documentElement.classList.contains("light")); }, []);
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("light", next === "light");
    try { localStorage.setItem("theme", next); } catch { /* storage blocked */ }
    setIsDark(!isDark);
  };
  return (
    <button onClick={toggle} className="icon-btn" title={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
