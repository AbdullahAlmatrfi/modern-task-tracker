import { useRef, useState, type FormEvent } from 'react';
import type { Auth } from '../hooks/useAuth';
import type { SyncState } from '../hooks/useSync';
import type { Prefs, WeekStart } from '../types';

interface Props {
  auth: Auth;
  sync: SyncState;
  prefs: Prefs;
  onPrefs: (patch: Partial<Prefs>) => void;
  onExport: () => void;
  onImport: (text: string) => string | null;
}

const WEEK_STARTS: { value: WeekStart; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 6, label: 'Sat' },
];

export function Account({ auth, sync, prefs, onPrefs, onExport, onImport }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSending(true);
    const err = creating ? await auth.signUp(email.trim(), password) : await auth.signIn(email.trim(), password);
    setSending(false);
    setMessage(err);
    if (!err) setPassword('');
  }

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const err = onImport(await f.text());
    setImportMsg(err ?? 'Imported.');
    if (file.current) file.current.value = '';
  }

  const statusClass = sync === 'syncing' ? 'busy' : sync === 'error' ? 'err' : sync === 'idle' ? 'ok' : '';
  const statusText =
    sync === 'syncing' ? 'Syncing' : sync === 'error' ? 'Sync problem, will retry' : sync === 'idle' ? 'Synced' : '';

  return (
    <section>
      <h2 className="sec">Account</h2>
      <div className="acct">
        {!auth.enabled && <p className="hintp">Saved on this device only. Add Supabase keys to sign in and sync.</p>}

        {auth.enabled && auth.user && (
          <>
            <div className="sync">
              <i className={statusClass} />
              <span>{auth.user.email}</span>
            </div>
            <div className="sync">
              <i className={statusClass} />
              <span>{statusText}</span>
            </div>
            <button type="button" className="btn ghost" onClick={() => void auth.signOut()}>
              Sign out
            </button>
          </>
        )}

        {auth.enabled && !auth.user && (
          <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="sr" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="hq"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="sr" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="hq"
              type="password"
              required
              minLength={6}
              autoComplete={creating ? 'new-password' : 'current-password'}
              placeholder="Password (6+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="btn solid" disabled={sending}>
              {sending ? '...' : creating ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setCreating((c) => !c);
                setMessage(null);
              }}
            >
              {creating ? 'I already have an account' : 'Create an account'}
            </button>
          </form>
        )}
        {message && <p className="hintp">{message}</p>}
      </div>

      <h2 className="sec" style={{ marginTop: 22 }}>
        Week starts on
      </h2>
      <div className="seg" role="group" aria-label="Week starts on">
        {WEEK_STARTS.map((w) => (
          <button key={w.value} type="button" aria-pressed={prefs.weekStart === w.value} onClick={() => onPrefs({ weekStart: w.value })}>
            {w.label}
          </button>
        ))}
      </div>

      <h2 className="sec" style={{ marginTop: 22 }}>
        Your data
      </h2>
      <div className="row2" style={{ marginTop: 12 }}>
        <button type="button" className="btn ghost" onClick={onExport}>
          Export JSON
        </button>
        <button type="button" className="btn ghost" onClick={() => file.current?.click()}>
          Import
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="sr"
          aria-label="Import file"
          onChange={(e) => void pick(e.target.files)}
        />
      </div>
      {importMsg && <p className="hintp">{importMsg}</p>}
    </section>
  );
}
