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
    bgRoot:       "radial-gradient(ellipse at center, #fdf8f0 0%, #f5f0e8 60%, #ede5d8 100%)",
    bgCard:       "rgba(255,252,245,0.92)",
    bgSidebar:    "rgba(250,245,235,0.98)",
    bgInput:      "rgba(0,0,0,0.05)",
    bgMsg:        "rgba(0,0,0,0.04)",
    bgUserMsg:    "rgba(139,90,200,0.12)",
    bgOverlay:    "rgba(245,240,232,0.6)",
    textPrimary:  "#2a1f0e",
    textSecond:   "#6b5a3e",
    textMuted:    "#9a8a6e",
    textTitle:    "#8b6914",
    gold:         "#8b6914",
    goldBorder:   "rgba(139,105,20,0.4)",
    goldBorderSt: "rgba(139,105,20,0.2)",
    borderCard:   "1px solid rgba(139,105,20,0.25)",
    scrollThumb:  "rgba(139,105,20,0.3)",
  },
};
