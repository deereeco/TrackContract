import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContractions } from '../../contexts/ContractionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getContractionsInTimeRange, getContractionsFromSessionStart } from '../../utils/calculations';
import { formatTime } from '../../utils/dateTime';
import ChartControls from './ChartControls';

const LINES = [
  { key: 'duration', label: 'Duration', color: '#3B82F6' },
  { key: 'interval', label: 'Interval', color: '#10B981' },
  { key: 'restTime', label: 'Rest Time', color: '#F59E0B' },
] as const;

type LineKey = typeof LINES[number]['key'];

const UNIT_KEY = 'chartYUnit';
const DOTS_KEY = 'chartShowDots';

const ContractionChart = () => {
  const { state } = useContractions();
  const { theme } = useTheme();
  const { contractions } = state;
  const [timeRange, setTimeRange] = useState(0);
  const [fromStart, setFromStart] = useState(false);
  const [yUnit, setYUnit] = useState<'sec' | 'min'>(
    () => (localStorage.getItem(UNIT_KEY) as 'sec' | 'min') ?? 'sec'
  );
  const [showDots, setShowDots] = useState<boolean>(
    () => localStorage.getItem(DOTS_KEY) === 'true'
  );
  const [visible, setVisible] = useState<Record<LineKey, boolean>>({
    duration: true,
    interval: true,
    restTime: true,
  });
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [zoomIndices, setZoomIndices] = useState<{ start: number; end: number } | null>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  const toggleUnit = () => {
    setYUnit(prev => {
      const next = prev === 'sec' ? 'min' : 'sec';
      localStorage.setItem(UNIT_KEY, next);
      return next;
    });
  };

  const toggleDots = () => {
    setShowDots(prev => {
      const next = !prev;
      localStorage.setItem(DOTS_KEY, String(next));
      return next;
    });
  };

  const toUnit = (seconds: number) =>
    yUnit === 'min' ? Math.round(seconds / 60 * 10) / 10 : Math.round(seconds);

  const chartData = useMemo(() => {
    let filtered: typeof contractions;
    if (fromStart && timeRange > 0) {
      filtered = getContractionsFromSessionStart(contractions, timeRange);
    } else if (!fromStart && timeRange > 0) {
      filtered = getContractionsInTimeRange(contractions, timeRange);
    } else {
      filtered = contractions;
    }

    const completed = filtered.filter(c => c.endTime && c.duration);
    const reversed = [...completed].reverse();

    return reversed.map((contraction, index) => {
      let intervalSec: number | null = null;
      let restTimeSec: number | null = null;

      if (index > 0) {
        const prev = reversed[index - 1];
        intervalSec = (contraction.startTime - prev.startTime) / 1000;
        if (prev.endTime) {
          restTimeSec = (contraction.startTime - prev.endTime) / 1000;
        }
      }

      return {
        time: formatTime(contraction.startTime),
        timestamp: contraction.startTime,
        duration: contraction.duration ? toUnit(contraction.duration) : null,
        interval: intervalSec !== null && intervalSec > 0 ? toUnit(intervalSec) : null,
        restTime: restTimeSec !== null && restTimeSec > 0 ? toUnit(restTimeSec) : null,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractions, timeRange, fromStart, yUnit]);

  // Reset zoom when data changes
  useEffect(() => {
    setZoomIndices(null);
  }, [chartData]);

  // Pinch-to-zoom
  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialStart = 0;
    let initialEnd = 0;
    let rafId = 0;

    const getDistance = (touches: TouchList) =>
      Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      );

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      initialDist = getDistance(e.touches);
      setZoomIndices(prev => {
        const cur = prev ?? { start: 0, end: chartData.length - 1 };
        initialStart = cur.start;
        initialEnd = cur.end;
        return cur;
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || initialDist === 0) return;
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newDist = getDistance(e.touches);
        const scale = newDist / initialDist;
        const initialLength = initialEnd - initialStart + 1;
        const newLength = Math.max(2, Math.round(initialLength / scale));
        const center = (initialStart + initialEnd) / 2;
        const newStart = Math.max(0, Math.round(center - newLength / 2));
        const newEnd = Math.min(chartData.length - 1, Math.round(center + newLength / 2));
        setZoomIndices({ start: newStart, end: newEnd });
      });
    };

    const onTouchEnd = () => {
      initialDist = 0;
      cancelAnimationFrame(rafId);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(rafId);
    };
  }, [chartData]);

  const displayData = useMemo(
    () => zoomIndices ? chartData.slice(zoomIndices.start, zoomIndices.end + 1) : chartData,
    [chartData, zoomIndices]
  );

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#334155' : '#cbd5e1';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  const toggle = (key: LineKey) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Contraction Patterns</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDots}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showDots
                ? 'bg-primary text-white'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title="Toggle data point dots"
          >
            Dots
          </button>
          <button
            onClick={toggleUnit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            title="Toggle Y-axis units"
          >
            <span className={yUnit === 'sec' ? 'font-bold text-primary' : 'text-slate-500 dark:text-slate-400'}>sec</span>
            <span className="text-slate-400">/</span>
            <span className={yUnit === 'min' ? 'font-bold text-primary' : 'text-slate-500 dark:text-slate-400'}>min</span>
          </button>
          <ChartControls
            timeRange={timeRange}
            fromStart={fromStart}
            onTimeRangeChange={(h, fs) => { setTimeRange(h); setFromStart(fs); }}
          />
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-slate-500 dark:text-slate-400">
            {contractions.length === 0
              ? 'Record at least 2 contractions to view the chart.'
              : 'No contractions found in this time range. Try selecting a wider range.'}
          </p>
        </div>
      ) : (
        <>
          {/* Line toggles */}
          <div className="flex flex-wrap gap-3">
            {LINES.map(({ key, label, color }) => {
              const on = visible[key];
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                    on ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{ borderColor: color, color: on ? color : axisColor }}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-sm border-2 flex-shrink-0"
                    style={{
                      borderColor: color,
                      backgroundColor: on ? color : 'transparent',
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Combined chart */}
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">All values in {yUnit === 'sec' ? 'seconds' : 'minutes'}</p>
              {zoomIndices && (
                <button
                  onClick={() => setZoomIndices(null)}
                  className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Reset Zoom
                </button>
              )}
            </div>
            <div
              ref={chartWrapperRef}
              onClick={() => setTooltipDismissed(true)}
              onTouchStart={() => setTooltipDismissed(false)}
            >
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={displayData}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor }} />
                  <YAxis
                    stroke={axisColor}
                    tick={{ fill: axisColor }}
                    label={{ value: yUnit, angle: -90, position: 'insideLeft', fill: axisColor, offset: 10 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [`${value} ${yUnit}`, name]}
                    active={tooltipDismissed ? false : undefined}
                  />
                  <Legend wrapperStyle={{ color: axisColor }} />
                  {visible.duration && (
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={showDots ? { fill: '#3B82F6', r: 4 } : false}
                      activeDot={showDots ? { r: 6 } : { r: 4 }}
                      name="Duration"
                      connectNulls
                    />
                  )}
                  {visible.interval && (
                    <Line
                      type="monotone"
                      dataKey="interval"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={showDots ? { fill: '#10B981', r: 4 } : false}
                      activeDot={showDots ? { r: 6 } : { r: 4 }}
                      name="Interval"
                      connectNulls
                    />
                  )}
                  {visible.restTime && (
                    <Line
                      type="monotone"
                      dataKey="restTime"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={showDots ? { fill: '#F59E0B', r: 4 } : false}
                      activeDot={showDots ? { r: 6 } : { r: 4 }}
                      name="Rest Time"
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContractionChart;
