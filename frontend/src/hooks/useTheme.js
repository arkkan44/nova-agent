import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("nova-theme") || "night";
  });

  useEffect(() => {
    localStorage.setItem("nova-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "night" ? "day" : "night");

  return { theme, toggleTheme, isDay: theme === "day" };
}

// ─── Palettes ────────────────────────────────────────────────
export const THEMES = {
  night: {
    bg:           "#000",
    bgRoot:       "radial-gradient(ellipse at center, #0a0510 0%, #050208 60%, #000 100%)",
    bgCard:       "rgba(0,0,0,0.6)",
    bgSidebar:    "rgba(5,5,10,0.97)",
    bgInput:      "rgba(255,255,255,0.08)",
    bgMsg:        "rgba(255,255,255,0.08)",
    bgUserMsg:    "rgba(139,90,200,0.25)",
    bgOverlay:    "rgba(0,0,0,0.75)",
    textPrimary:  "#f0e8d8",
    textSecond:   "#a09080",
    textMuted:    "#706050",
    textTitle:    "#d4a84b",
    gold:         "#d4a84b",
    goldBorder:   "rgba(200,160,80,0.35)",
    goldBorderSt: "rgba(200,160,80,0.2)",
    borderCard:   "1px solid rgba(200,160,80,0.2)",
    scrollThumb:  "rgba(200,160,80,0.4)",
  },
  day: {
    bg:           "#f5f0e8",
    bgRoot:       "#f0ece3",
    bgCard:       "rgba(255,252,248,0.95)",
    bgSidebar:    "rgba(248,244,236,0.99)",
    bgInput:      "rgba(0,0,0,0.06)",
    bgMsg:        "rgba(0,0,0,0.05)",
    bgUserMsg:    "rgba(100,70,180,0.1)",
    bgOverlay:    "transparent",
    textPrimary:  "#1a1208",
    textSecond:   "#3d2e14",
    textMuted:    "#7a6a4a",
    textTitle:    "#2a1f0a",
    gold:         "#5a3e08",
    goldBorder:   "rgba(90,62,8,0.3)",
    goldBorderSt: "rgba(90,62,8,0.15)",
    borderCard:   "1px solid rgba(90,62,8,0.2)",
    scrollThumb:  "rgba(90,62,8,0.25)",
    showVideo:    false,
  },
};
