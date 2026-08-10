'use client';

import { Button } from '@/components/ui';

export default function Error({ error, reset }) {
  return (
    <div className="page-shell flex min-h-[calc(100vh-65px)] items-center justify-center p-6">
      <div className="surface-panel max-w-lg p-8 text-center">
      <p className="eyebrow">Unexpected error</p>
      <h1 className="mt-2 text-xl font-bold text-primary">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">
        {error?.message || 'An unexpected error occurred loading this page.'}
      </p>
      <Button onClick={() => reset()} className="mt-5">
        Try again
      </Button>
      </div>
    </div>
  );
}