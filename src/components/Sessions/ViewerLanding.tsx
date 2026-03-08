import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { resolveShareToken } from '../../services/firebase/sessionClient';
import { setViewerSessionId } from '../../services/storage/localStorage';

interface ViewerLandingProps {
  onBack?: () => void;
}

const ViewerLanding = ({ onBack }: ViewerLandingProps) => {
  const { selectSession } = useSession();
  const { signInAnonymously, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Extract token from full URL or treat input as raw token
      let token = input.trim();
      const hashMatch = token.match(/[#&]token=([^&]+)/);
      if (hashMatch) {
        token = hashMatch[1];
      }

      if (!token) {
        setError('Please enter a share link or code.');
        return;
      }

      // Resolve token to session ID
      const sessionId = await resolveShareToken(token);
      if (!sessionId) {
        setError('Session not found. Check the link and try again.');
        return;
      }

      // Sign in anonymously if not already authenticated
      if (!user) {
        await signInAnonymously();
      }

      setViewerSessionId(sessionId);
      await selectSession(sessionId);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Join a session to view contractions in real time
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 space-y-4">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Share link or code
              </label>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste the share link here"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
            <button
              onClick={() => { if (user) signOut(); else onBack?.(); }}
              className="text-sm text-primary hover:underline"
            >
              Sign in with your own Google account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerLanding;
