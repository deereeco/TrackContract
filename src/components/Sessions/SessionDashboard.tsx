import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Play, Archive, LogOut, Moon, Sun } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateTime } from '../../utils/dateTime';

const SessionDashboard = () => {
  const { sessions, sessionsLoading, createSession, selectSession, updateSession } = useSession();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !user) return;
    setCreating(true);
    try {
      await createSession(name);
      setNewName('');
      setShowInput(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await updateSession(id, { active: false });
  };

  const activeSessions = sessions.filter(s => s.active);
  const archivedSessions = sessions.filter(s => !s.active);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sessions</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Each session tracks one patient's contractions.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0 pt-1"
          >
            <LogOut className="w-4 h-4" />
            {user?.displayName ?? user?.email ?? 'Sign out'}
          </button>
        </div>

        {/* New session */}
        {showInput ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Patient name (e.g. Brittany)"
              autoFocus
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setNewName(''); }}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        )}

        {/* Active sessions */}
        {sessionsLoading ? (
          <div className="text-center py-8 text-slate-500">Loading sessions...</div>
        ) : (
          <div className="space-y-2">
            {activeSessions.map(session => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {session.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Created {formatDateTime(session.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={e => handleArchive(e, session.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                    title="Archive session"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => selectSession(session.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Open
                  </button>
                </div>
              </motion.div>
            ))}

            {activeSessions.length === 0 && !showInput && (
              <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                No active sessions. Create one to get started.
              </p>
            )}
          </div>
        )}

        {/* Archived sessions */}
        {archivedSessions.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 select-none">
              {archivedSessions.length} archived session{archivedSessions.length !== 1 ? 's' : ''}
            </summary>
            <div className="mt-2 space-y-2">
              {archivedSessions.map(session => (
                <div
                  key={session.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4 opacity-60"
                >
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-300">{session.name}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(session.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => updateSession(session.id, { active: true })}
                    className="text-sm text-primary hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default SessionDashboard;
