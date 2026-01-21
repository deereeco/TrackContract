import { useState } from 'react';
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

type Tab = 'timer' | 'list' | 'chart' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');

  return (
    <ThemeProvider>
      <SyncProvider>
        <ContractionProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
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
