import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { getIntensityPromptEnabled, setIntensityPromptEnabled } from '../../services/storage/localStorage';

const IntensityToggle = () => {
  const [enabled, setEnabled] = useState(getIntensityPromptEnabled());

  useEffect(() => {
    // Sync with localStorage on mount
    setEnabled(getIntensityPromptEnabled());
  }, []);

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setIntensityPromptEnabled(newValue);
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
      <button
        onClick={handleToggle}
        className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
      >
        <div className="flex-shrink-0">
          {enabled ? (
            <ToggleRight className="w-8 h-8 text-primary" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium">Prompt for intensity after timer</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </button>
    </div>
  );
};

export default IntensityToggle;
