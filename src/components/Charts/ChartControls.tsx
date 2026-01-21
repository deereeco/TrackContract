interface ChartControlsProps {
  timeRange: number;
  onTimeRangeChange: (hours: number) => void;
}

const timeRanges = [
  { label: '1 Hour', hours: 1 },
  { label: '6 Hours', hours: 6 },
  { label: '24 Hours', hours: 24 },
  { label: 'All', hours: 0 },
];

const ChartControls = ({ timeRange, onTimeRangeChange }: ChartControlsProps) => {
  return (
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
  );
};

export default ChartControls;
