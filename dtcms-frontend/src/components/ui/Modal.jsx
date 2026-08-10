'use client';
import Button from './Button';

export default function Modal({
  isOpen,
  title,
  children,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />

      {/* dialog */}
      <div className="relative w-full max-w-sm rounded-lg border border-primary/10 bg-white p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-primary">{title}</h2>

        {children && (
          <div className="mb-5 text-sm text-ink/70">{children}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
