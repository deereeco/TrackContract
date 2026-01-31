import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ContractionProvider } from './contexts/ContractionContext';
import { SyncProvider } from './contexts/SyncContext';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import TimerButton from './components/Timer/TimerButton';
import IntensityToggle from './components/Timer/IntensityToggle';
import ContractionSummary from './components/Timer/ContractionSummary';
import ContractionList from './components/ContractionList/ContractionList';
import ContractionChart from './components/Charts/ContractionChart';
import Settings from './components/Settings/Settings';
import DebugConsole from './components/Debug/DebugConsole';
import { checkAndApplyUrlConfig } from './utils/urlConfig';
import { getSyncBackend, setSyncBackend } from './services/storage/localStorage';
import { initializeAuth, checkFirebaseConfig } from './config/firebase';
import { setUserIdFromShareLink } from './services/firebase/firestoreClient';

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

  // Initialize Firebase and check for share link on mount
  useEffect(() => {
    const initializeFirebase = async () => {
      let backend = getSyncBackend();

      // Check for userId in URL hash (share link)
      const hash = window.location.hash;
      const userIdMatch = hash.match(/userId=([^&]+)/);
      if (userIdMatch) {
        const userId = userIdMatch[1];
        setUserIdFromShareLink(userId);

        // Auto-configure Firebase backend when using share link
        if (checkFirebaseConfig()) {
          setSyncBackend('firebase');
          backend = 'firebase';
          console.log('Share link detected - switched to Firebase backend');
        }

        // Clean up URL (for privacy)
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Initialize Firebase if backend is set to Firebase and config is available
      if (backend === 'firebase' && checkFirebaseConfig()) {
        try {
          await initializeAuth();
          console.log('Firebase initialized successfully');
        } catch (error) {
          console.error('Failed to initialize Firebase:', error);
        }
      }
    };

    initializeFirebase();
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
                    <IntensityToggle />
                    <ContractionSummary />
                  </div>
                )}

                {activeTab === 'list' && <ContractionList />}

                {activeTab === 'chart' && <ContractionChart />}

                {activeTab === 'settings' && <Settings />}
              </div>
            </main>
          </div>
          <DebugConsole />
        </ContractionProvider>
      </SyncProvider>
    </ThemeProvider>
  );
}

export default App;
