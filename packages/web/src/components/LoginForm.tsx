import { useState } from 'react';
import { api } from '@/api';

interface Props {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    try {
      const ok = await api.login(password);
      if (ok) {
        onSuccess();
      } else {
        setError(true);
        setPassword('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm p-4">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 mt-16">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Medication Tracker</h1>
          <p className="text-xs text-muted-foreground">Enter your password to continue</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <p className="text-xs text-destructive">Incorrect password — try again.</p>}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
