import { Clock, List, BarChart3, Settings as SettingsIcon } from 'lucide-react';

type Tab = 'timer' | 'list' | 'chart' | 'settings';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'timer' as Tab, label: 'Timer', icon: Clock },
  { id: 'list' as Tab, label: 'List', icon: List },
  { id: 'chart' as Tab, label: 'Chart', icon: BarChart3 },
  { id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon },
];

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 md:border-t-0 md:border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-around md:justify-center md:gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col md:flex-row items-center gap-1 md:gap-2 py-3 px-4
                  transition-colors relative
                  ${isActive
                    ? 'text-primary'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm md:text-base font-medium">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full md:rounded-t-none md:rounded-l-full md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-1 md:h-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
