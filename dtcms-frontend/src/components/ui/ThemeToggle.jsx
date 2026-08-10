'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'dtcms-theme';

export default function ThemeToggle({ variant = 'ghost' }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains('dark');

    document.documentElement.classList.toggle('dark', nextIsDark);
    document.documentElement.style.colorScheme = nextIsDark ? 'dark' : 'light';
    window.localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? 'dark' : 'light');
    setIsDark(nextIsDark);
  };

  // "ghost-light" is for placing the toggle on a dark/navy surface (e.g. the
  // navy Navbar); the default works on light surfaces (e.g. AdminTopbar).
  const lightSurfaceClasses = 'text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/60';
  const darkSurfaceClasses = 'text-ink/55 hover:bg-accent hover:text-ink focus-visible:ring-secondary/40';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex h-9 w-9 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 ${
        variant === 'ghost-light' ? lightSurfaceClasses : darkSurfaceClasses
      }`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
