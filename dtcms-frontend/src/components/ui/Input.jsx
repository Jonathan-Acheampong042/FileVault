export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  className = '',
  name,
  id,
  autoComplete,
  disabled = false,
  readOnly = false,
  step,
  min,
  max,
  error,
  onBlur,
}) {
  return (
    <label className={`block text-sm font-medium text-ink ${className}`}>
      <span>{label}{required && <span className="ml-1 text-danger">*</span>}</span>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        readOnly={readOnly}
        step={step}
        min={min}
        max={max}
        className={`mt-2 block w-full rounded-md border bg-white px-3 py-2 text-sm text-ink shadow-xs placeholder:text-ink/35 outline-none transition focus:border-secondary focus:ring-1 focus:ring-secondary disabled:cursor-not-allowed disabled:bg-accent/60 disabled:opacity-70 ${
          error ? 'border-danger focus:border-danger focus:ring-danger/40' : 'border-primary/15'
        }`}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span>}
    </label>
  );
}
