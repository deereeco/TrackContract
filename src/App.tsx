import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UpdateProvider } from './contexts/UpdateContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider, useSession } from './contexts/SessionContext';
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
import GoogleSignIn from './components/Auth/GoogleSignIn';
import SessionDashboard from './components/Sessions/SessionDashboard';
import ViewerLanding from './components/Sessions/ViewerLanding';
import { resolveShareToken } from './services/firebase/sessionClient';
import { setUserIdFromShareLink as setLegacyUserId } from './services/firebase/firestoreClient';
import { setViewerSessionId as storeViewerSessionId } from './services/storage/localStorage';
import { signInAnonymouslyForViewer } from './config/firebase';

type Tab = 'timer' | 'list' | 'chart' | 'settings';

/**
 * Inner app — rendered after auth and providers are ready.
 * Handles URL hash resolution and decides what to render.
 */
const AppContent = () => {
  const { user, isAnonymous, authLoading, signInAnonymously } = useAuth();
  const { activeSession, selectSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const [showViewerLanding, setShowViewerLanding] = useState(false);
  const [hashResolved, setHashResolved] = useState(false);

  // Resolve URL hash on mount (before deciding what to render)
  useEffect(() => {
    const resolveHash = async () => {
      const hash = window.location.hash;

      if (hash.includes('token=')) {
        // New-style share link: #token={shareToken}
        const tokenMatch = hash.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          try {
            const sessionId = await resolveShareToken(token);
            if (sessionId) {
              storeViewerSessionId(sessionId);
              await signInAnonymously();
              await selectSession(sessionId);
            }
          } catch (err) {
            console.error('Failed to resolve share token:', err);
          }
        }
        window.history.replaceState(null, '', window.location.pathname);

      } else if (hash.includes('session=')) {
        // Direct session ID link: #session={sessionId}
        const sessionMatch = hash.match(/session=([^&]+)/);
        if (sessionMatch) {
          const sessionId = sessionMatch[1];
          storeViewerSessionId(sessionId);
          try {
            await signInAnonymously();
            await selectSession(sessionId);
          } catch (err) {
            console.error('Failed to join session:', err);
          }
        }
        window.history.replaceState(null, '', window.location.pathname);

      } else if (hash.includes('userId=')) {
        // Legacy share link: #userId={uuid}
        const userIdMatch = hash.match(/userId=([^&]+)/);
        if (userIdMatch) {
          setLegacyUserId(userIdMatch[1]);
          await signInAnonymouslyForViewer();
        }
        window.history.replaceState(null, '', window.location.pathname);
      }

      setHashResolved(true);
    };

    resolveHash();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || !hashResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated at all → show sign-in or viewer landing
  if (!user) {
    if (showViewerLanding) return <ViewerLanding onBack={() => setShowViewerLanding(false)} />;
    return <GoogleSignIn onViewSession={() => setShowViewerLanding(true)} />;
  }

  // Authenticated but no active session
  if (!activeSession) {
    if (isAnonymous) return <ViewerLanding />;
    return <SessionDashboard />;
  }

  // Active session → main tracker UI
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
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
      <DebugConsole />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <UpdateProvider>
        <AuthProvider>
          <SessionProvider>
            <SyncProvider>
              <ContractionProvider>
                <AppContent />
              </ContractionProvider>
            </SyncProvider>
          </SessionProvider>
        </AuthProvider>
      </UpdateProvider>
    </ThemeProvider>
  );
}

export default App;
