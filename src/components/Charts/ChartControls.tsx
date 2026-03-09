import { useState } from 'react';

interface ChartControlsProps {
  timeRange: number;
  fromStart: boolean;
  onTimeRangeChange: (hours: number, fromStart: boolean) => void;
}

const fromNowRanges = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: 'All', hours: 0 },
];

const fromStartRanges = [
  { label: 'First 1h', hours: 1 },
  { label: 'First 4h', hours: 4 },
  { label: 'First 10h', hours: 10 },
  { label: 'First 24h', hours: 24 },
];

const ChartControls = ({ timeRange, fromStart, onTimeRangeChange }: ChartControlsProps) => {
  const [showMore, setShowMore] = useState(fromStart);
  const [customHours, setCustomHours] = useState('');

  const handleFromNow = (hours: number) => {
    setShowMore(false);
    onTimeRangeChange(hours, false);
  };

  const handleFromStart = (hours: number) => {
    onTimeRangeChange(hours, true);
  };

  const handleCustomSubmit = () => {
    const h = parseInt(customHours, 10);
    if (h > 0) onTimeRangeChange(h, true);
  };

  const isActiveFromNow = (hours: number) => !fromStart && timeRange === hours;
  const isActiveFromStart = (hours: number) => fromStart && timeRange === hours;

  const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';
  const btnActive = 'bg-primary text-white';
  const btnInactive = 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Time Range</label>
      <div className="flex gap-2 flex-wrap items-center">
        {fromNowRanges.map((range) => (
          <button
            key={range.hours}
            onClick={() => handleFromNow(range.hours)}
            className={`${btnBase} ${isActiveFromNow(range.hours) ? btnActive : btnInactive}`}
          >
            {range.label}
          </button>
        ))}
        <button
          onClick={() => setShowMore(v => !v)}
          className={`${btnBase} ${showMore ? btnActive : btnInactive}`}
        >
          More {showMore ? '▴' : '▾'}
        </button>
      </div>

      {showMore && (
        <div className="flex gap-2 flex-wrap items-center pl-1 border-l-2 border-primary/30">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">From start:</span>
          {fromStartRanges.map((range) => (
            <button
              key={range.hours}
              onClick={() => handleFromStart(range.hours)}
              className={`${btnBase} ${isActiveFromStart(range.hours) ? btnActive : btnInactive}`}
            >
              {range.label}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={customHours}
              onChange={e => setCustomHours(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
              onBlur={handleCustomSubmit}
              placeholder="hrs"
              className="w-14 px-2 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartControls;
