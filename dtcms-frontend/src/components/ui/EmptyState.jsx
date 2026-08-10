import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ message = 'No data found', actionLabel = null, onAction = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white px-6 py-16 text-center shadow-sm">
      <Inbox className="mb-3 h-12 w-12 text-ink/20" strokeWidth={1.5} />
      <p className="max-w-sm text-sm text-ink/60">{message}</p>
      {actionLabel && onAction && (
        <Button
          variant="secondary"
          onClick={onAction}
          type="button"
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
