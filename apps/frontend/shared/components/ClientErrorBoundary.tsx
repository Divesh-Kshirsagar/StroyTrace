'use client';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/shared/components/ui/button';
import { AlertCircle } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: () => void }) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-red-100 dark:border-red-900/30">
      <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm max-w-md">
        {error.message || "We couldn't load this content"}
      </p>
      <Button variant="outline" onClick={resetErrorBoundary}>Try Again</Button>
    </div>
  );
}

export default function ClientErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
