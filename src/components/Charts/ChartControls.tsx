import { ChartDisplayMode } from '../../services/storage/localStorage';

interface ChartControlsProps {
  timeRange: number;
  onTimeRangeChange: (hours: number) => void;
  displayMode: ChartDisplayMode;
  onDisplayModeChange: (mode: ChartDisplayMode) => void;
}

const timeRanges = [
  { label: '1 Hour', hours: 1 },
  { label: '6 Hours', hours: 6 },
  { label: '24 Hours', hours: 24 },
  { label: 'All', hours: 0 },
];

const displayModes: { label: string; mode: ChartDisplayMode }[] = [
  { label: 'Duration', mode: 'duration' },
  { label: 'Interval', mode: 'interval' },
  { label: 'Both', mode: 'both' },
];

const ChartControls = ({ timeRange, onTimeRangeChange, displayMode, onDisplayModeChange }: ChartControlsProps) => {
  return (
    <div className="space-y-4">
      {/* Display Mode Controls */}
      <div>
        <label className="block text-sm font-medium mb-2">Chart View</label>
        <div className="flex gap-2 flex-wrap">
          {displayModes.map((mode) => (
            <button
              key={mode.mode}
              onClick={() => onDisplayModeChange(mode.mode)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${displayMode === mode.mode
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range Controls */}
      <div>
        <label className="block text-sm font-medium mb-2">Time Range</label>
        <div className="flex gap-2 flex-wrap">
          {timeRanges.map((range) => (
            <button
              key={range.hours}
              onClick={() => onTimeRangeChange(range.hours)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${timeRange === range.hours
                  ? 'bg-primary text-white'
                  : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
