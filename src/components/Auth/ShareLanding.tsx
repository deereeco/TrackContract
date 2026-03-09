import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ShareLandingProps {
  alreadySignedIn: boolean;
  displayName: string | null;
  onSaveAndView: () => void;
  onJustView: () => void;
  loading?: boolean;
}

const ShareLanding = ({ alreadySignedIn, displayName, onSaveAndView, onJustView, loading }: ShareLandingProps) => {
  const { theme, toggleTheme } = useTheme();

  const primaryLabel = alreadySignedIn
    ? `Continue as ${displayName ?? 'me'}`
    : 'Sign in with Google';

  const secondaryLabel = alreadySignedIn ? 'Just view it' : 'Continue as Guest';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Contraction Tracker</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            You've been invited to view a contraction session
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 space-y-4">
          {/* Primary: sign in / continue as self — saves to sessions list */}
          <button
            onClick={onSaveAndView}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {!alreadySignedIn && (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Loading...' : primaryLabel}
          </button>
          {!alreadySignedIn && (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 -mt-2">
              Session will be saved to your account
            </p>
          )}
          {alreadySignedIn && (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 -mt-2">
              Session will be saved to your sessions list
            </p>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-white dark:bg-slate-800 px-2">or</span>
            </div>
          </div>

          {/* Secondary: guest / just view — no saving */}
          <button
            onClick={onJustView}
            disabled={loading}
            className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 -mt-2">
            View only — session won't be saved
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareLanding;
