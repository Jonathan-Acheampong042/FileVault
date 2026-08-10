export default function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium shadow-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none active:translate-y-px';

  const variants = {
    primary: 'border border-primary bg-primary text-white hover:border-secondary hover:bg-secondary',
    secondary: 'border border-primary/15 bg-accent text-primary hover:border-primary/25 hover:bg-accent/70',
    danger: 'border border-danger bg-danger text-white hover:bg-danger/90',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
