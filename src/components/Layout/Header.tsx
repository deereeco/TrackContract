import { Moon, Sun, WifiOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSync } from '../../contexts/SyncContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useSync();

  return (
    <header className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">Contraction Tracker</h1>
            {!isOnline && (
              <div className="flex items-center gap-1 text-sm text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
