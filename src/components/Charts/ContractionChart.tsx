import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContractions } from '../../contexts/ContractionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getContractionsInTimeRange } from '../../utils/calculations';
import { formatTime } from '../../utils/dateTime';
import ChartControls from './ChartControls';
import { ChartDisplayMode, getChartDisplayMode, setChartDisplayMode } from '../../services/storage/localStorage';

const ContractionChart = () => {
  const { state } = useContractions();
  const { theme } = useTheme();
  const { contractions } = state;
  const [timeRange, setTimeRange] = useState(6); // Default to 6 hours
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>(getChartDisplayMode());

  const chartData = useMemo(() => {
    const filteredContractions = timeRange > 0
      ? getContractionsInTimeRange(contractions, timeRange)
      : contractions;

    // Only include completed contractions
    const completed = filteredContractions.filter(c => c.endTime && c.duration);

    // Reverse to show chronologically
    const reversed = [...completed].reverse();

    return reversed.map((contraction, index) => {
      // Calculate interval from previous contraction
      let interval = 0;
      if (index > 0 && reversed[index - 1].endTime) {
        interval = Math.floor((contraction.startTime - reversed[index - 1].endTime!) / 1000 / 60); // minutes
      }

      return {
        time: formatTime(contraction.startTime),
        timestamp: contraction.startTime,
        duration: contraction.duration,
        interval: interval > 0 ? interval : null,
      };
    });
  }, [contractions, timeRange]);

  const isDark = theme === 'dark';

  const handleModeChange = (mode: ChartDisplayMode) => {
    setDisplayMode(mode);
    setChartDisplayMode(mode);
  };

  const renderDurationChart = () => (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#334155' : '#cbd5e1'}
          />
          <XAxis
            dataKey="time"
            stroke={isDark ? '#94a3b8' : '#64748b'}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
          />
          <YAxis
            label={{ value: 'Duration (seconds)', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#94a3b8' : '#64748b'}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              color: isDark ? '#f1f5f9' : '#0f172a',
            }}
            formatter={(value: any) => [`${value}s`, 'Duration']}
          />
          <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            name="Duration (seconds)"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <div className="w-4 h-4 bg-primary rounded"></div>
        <span className="text-slate-600 dark:text-slate-400">Duration (seconds)</span>
      </div>
    </div>
  );

  const renderIntervalChart = () => (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#334155' : '#cbd5e1'}
          />
          <XAxis
            dataKey="time"
            stroke={isDark ? '#94a3b8' : '#64748b'}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
          />
          <YAxis
            label={{ value: 'Interval (minutes)', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }}
            stroke={isDark ? '#94a3b8' : '#64748b'}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              borderRadius: '8px',
              color: isDark ? '#f1f5f9' : '#0f172a',
            }}
            formatter={(value: any) => [`${value}m`, 'Interval']}
          />
          <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
          <Line
            type="monotone"
            dataKey="interval"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            name="Interval (minutes)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <div className="w-4 h-4 bg-green-500 rounded"></div>
        <span className="text-slate-600 dark:text-slate-400">Interval (minutes apart)</span>
      </div>
    </div>
  );

  const renderBothCharts = () => (
    <div className="space-y-4">
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Contraction Duration</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#334155' : '#cbd5e1'}
            />
            <XAxis
              dataKey="time"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <YAxis
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '8px',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              formatter={(value: any) => [`${value}s`, 'Duration']}
            />
            <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
            <Line
              type="monotone"
              dataKey="duration"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              name="Duration (seconds)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Time Between Contractions</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#334155' : '#cbd5e1'}
            />
            <XAxis
              dataKey="time"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <YAxis
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                borderRadius: '8px',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              formatter={(value: any) => [`${value}m`, 'Interval']}
            />
            <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
            <Line
              type="monotone"
              dataKey="interval"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
              name="Interval (minutes)"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (chartData.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-500 dark:text-slate-400">
          Not enough data to display chart. Record at least 2 contractions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Contraction Patterns</h2>
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          displayMode={displayMode}
          onDisplayModeChange={handleModeChange}
        />
      </div>

      {displayMode === 'duration' && renderDurationChart()}
      {displayMode === 'interval' && renderIntervalChart()}
      {displayMode === 'both' && renderBothCharts()}
    </div>
  );
};

export default ContractionChart;
