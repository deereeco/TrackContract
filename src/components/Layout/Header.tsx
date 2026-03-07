import { Moon, Sun, WifiOff, LayoutGrid } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSync } from '../../contexts/SyncContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useSync();
  const { user, isAnonymous } = useAuth();
  const { activeSession, clearSession, isOwner } = useSession();

  return (
    <header className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold text-primary shrink-0">Contraction Tracker</h1>
            {!isOnline && (
              <div className="flex items-center gap-1 text-sm text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {/* Session info */}
            {activeSession && (
              <div className="flex items-center gap-2 min-w-0">
                {!isAnonymous ? (
                  // Owner: show session name with switch button
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-32">
                      {activeSession.name}
                    </span>
                    <button
                      onClick={clearSession}
                      title="Switch session"
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors shrink-0"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Viewer: show "Viewing: name" badge
                  <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-40">
                    Viewing: <span className="font-medium text-slate-700 dark:text-slate-300">{activeSession.name}</span>
                  </span>
                )}
              </div>
            )}

            {/* Google avatar (non-anonymous) */}
            {user && !isAnonymous && (
              <div
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0"
                title={user.displayName ?? user.email ?? 'Signed in'}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? ''} className="w-full h-full object-cover" />
                ) : (
                  (user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
                )}
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Owner indicator for non-owners in an active session */}
        {activeSession && isAnonymous && !isOwner && (
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            You can add contractions to this session
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
