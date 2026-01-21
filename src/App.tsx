import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ContractionProvider } from './contexts/ContractionContext';
import { SyncProvider } from './contexts/SyncContext';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import TimerButton from './components/Timer/TimerButton';
import ContractionSummary from './components/Timer/ContractionSummary';
import ContractionList from './components/ContractionList/ContractionList';
import ContractionChart from './components/Charts/ContractionChart';
import Settings from './components/Settings/Settings';
import { checkAndApplyUrlConfig } from './utils/urlConfig';

type Tab = 'timer' | 'list' | 'chart' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const [showConfigMessage, setShowConfigMessage] = useState(false);

  // Check for URL configuration on mount
  useEffect(() => {
    const wasConfigured = checkAndApplyUrlConfig();
    if (wasConfigured) {
      setShowConfigMessage(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowConfigMessage(false), 5000);
    }
  }, []);

  return (
    <ThemeProvider>
      <SyncProvider>
        <ContractionProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Auto-configuration success message */}
            {showConfigMessage && (
              <div className="bg-green-100 dark:bg-green-900/30 border-b border-green-300 dark:border-green-700 px-4 py-3 text-center">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  ✓ App automatically configured! You're ready to track contractions.
                </p>
              </div>
            )}

            <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
              <div className="max-w-4xl mx-auto">
                {activeTab === 'timer' && (
                  <div className="space-y-8">
                    <TimerButton />
                    <ContractionSummary />
                  </div>
                )}

                {activeTab === 'list' && <ContractionList />}

                {activeTab === 'chart' && <ContractionChart />}

                {activeTab === 'settings' && <Settings />}
              </div>
            </main>
          </div>
        </ContractionProvider>
      </SyncProvider>
    </ThemeProvider>
  );
}

export default App;
