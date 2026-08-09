import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './button';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  /** Use 'ghost-light' for headers with dark backgrounds (sidebar, navy topbar) */
  variant?: 'ghost' | 'ghost-light';
}

export function ThemeToggle({ className, variant = 'ghost' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Prevent hydration mismatch — render empty placeholder until mounted
  if (!mounted) return <div className="w-9 h-9 shrink-0" />;

  const lightClasses = 'text-white hover:bg-white/15 hover:text-white';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`shrink-0 transition-colors ${variant === 'ghost-light' ? lightClasses : ''} ${className ?? ''}`}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
