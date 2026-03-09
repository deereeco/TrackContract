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
import ShareLanding from './components/Auth/ShareLanding';
import SessionDashboard from './components/Sessions/SessionDashboard';
import ViewerLanding from './components/Sessions/ViewerLanding';
import { resolveShareToken, saveSharedSession } from './services/firebase/sessionClient';
import { setUserIdFromShareLink as setLegacyUserId } from './services/firebase/firestoreClient';
import { signInAnonymouslyForViewer } from './config/firebase';

type Tab = 'timer' | 'list' | 'chart' | 'settings';
type PendingAction = 'save-and-view' | 'just-view';

/**
 * Inner app — rendered after auth and providers are ready.
 * Handles URL hash resolution and decides what to render.
 */
const AppContent = () => {
  const { user, isAnonymous, authLoading, signInAnonymously, signInWithGoogle } = useAuth();
  const { activeSession, selectSession } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const [showViewerLanding, setShowViewerLanding] = useState(false);
  const [hashResolved, setHashResolved] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showShareLanding, setShowShareLanding] = useState(false);
  const [shareLandingLoading, setShareLandingLoading] = useState(false);

  // Resolve URL hash on mount (before deciding what to render)
  useEffect(() => {
    const resolveHash = async () => {
      const hash = window.location.hash;

      if (hash.includes('token=')) {
        // New-style share link: #token={shareToken} — show choice page instead of auto-signing in
        const tokenMatch = hash.match(/token=([^&]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          try {
            const sessionId = await resolveShareToken(token);
            if (sessionId) {
              setPendingSessionId(sessionId);
              setShowShareLanding(true);
            }
          } catch (err) {
            console.error('Failed to resolve share token:', err);
          }
        }
        window.history.replaceState(null, '', window.location.pathname);

      } else if (hash.includes('session=')) {
        // Direct session ID link: #session={sessionId} — also show choice page
        const sessionMatch = hash.match(/session=([^&]+)/);
        if (sessionMatch) {
          const sessionId = sessionMatch[1];
          setPendingSessionId(sessionId);
          setShowShareLanding(true);
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

  // After auth resolves and a pending action is set, load the shared session
  useEffect(() => {
    if (!pendingSessionId || !pendingAction || !user) return;

    const run = async () => {
      try {
        if (pendingAction === 'save-and-view' && !user.isAnonymous) {
          await saveSharedSession(user.uid, pendingSessionId);
        }
        await selectSession(pendingSessionId);
      } catch (err) {
        console.error('Failed to load shared session:', err);
      } finally {
        setPendingSessionId(null);
        setPendingAction(null);
        setShowShareLanding(false);
        setShareLandingLoading(false);
      }
    };

    run();
  }, [user?.uid, pendingSessionId, pendingAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAndView = async () => {
    setShareLandingLoading(true);
    setPendingAction('save-and-view');
    if (!user || user.isAnonymous) {
      try {
        await signInWithGoogle();
        // pendingAction effect fires once user state updates
      } catch (err) {
        console.error('Google sign-in failed:', err);
        setShareLandingLoading(false);
        setPendingAction(null);
      }
    }
    // If already signed in as Google, the effect fires immediately
  };

  const handleJustView = async () => {
    setShareLandingLoading(true);
    setPendingAction('just-view');
    if (!user) {
      try {
        await signInAnonymously();
        // pendingAction effect fires once user state updates
      } catch (err) {
        console.error('Anonymous sign-in failed:', err);
        setShareLandingLoading(false);
        setPendingAction(null);
      }
    }
    // If already signed in (as Google or anon), the effect fires immediately
  };

  if (authLoading || !hashResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Share link detected — show choice page (sign in with Google or continue as guest)
  if (showShareLanding && pendingSessionId) {
    return (
      <ShareLanding
        alreadySignedIn={!!(user && !user.isAnonymous)}
        displayName={user?.displayName ?? user?.email ?? null}
        onSaveAndView={handleSaveAndView}
        onJustView={handleJustView}
        loading={shareLandingLoading}
      />
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
