import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContractions } from '../../contexts/ContractionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getContractionsInTimeRange } from '../../utils/calculations';
import { formatTime } from '../../utils/dateTime';
import ChartControls from './ChartControls';

const ContractionChart = () => {
  const { state } = useContractions();
  const { theme } = useTheme();
  const { contractions } = state;
  const [timeRange, setTimeRange] = useState(0); // Default to All

  const chartData = useMemo(() => {
    const filteredContractions = timeRange > 0
      ? getContractionsInTimeRange(contractions, timeRange)
      : contractions;

    // Only include completed contractions
    const completed = filteredContractions.filter(c => c.endTime && c.duration);

    // Reverse to show chronologically
    const reversed = [...completed].reverse();

    return reversed.map((contraction, index) => {
      let interval = null;
      let restTime = null;

      if (index > 0) {
        const prev = reversed[index - 1];
        interval = Math.floor((contraction.startTime - prev.startTime) / 1000 / 60); // minutes
        if (prev.endTime) {
          restTime = Math.floor((contraction.startTime - prev.endTime) / 1000 / 60); // minutes
        }
      }

      return {
        time: formatTime(contraction.startTime),
        timestamp: contraction.startTime,
        duration: contraction.duration,
        interval: interval !== null && interval > 0 ? interval : null,
        restTime: restTime !== null && restTime > 0 ? restTime : null,
      };
    });
  }, [contractions, timeRange]);

  const isDark = theme === 'dark';

  const gridColor = isDark ? '#334155' : '#cbd5e1';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  const emptyMessage = timeRange > 0
    ? 'No contractions found in this time range. Try selecting a wider range.'
    : 'Record at least 2 contractions to view the chart.';

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Contraction Patterns</h2>
        <ChartControls
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </div>

      {chartData.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <>
      {/* Duration Chart */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold">Contraction Duration</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 italic">How long each contraction lasted (seconds)</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor }} />
            <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}s`, 'Duration']} />
            <Legend wrapperStyle={{ color: axisColor }} />
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

      {/* Interval Chart */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold">Time Between Contractions</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 italic">From start of one contraction to start of the next</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor }} />
            <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}m`, 'Interval']} />
            <Legend wrapperStyle={{ color: axisColor }} />
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

      {/* Rest Time Chart */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold">Rest Time</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 italic">Actual break between contractions (end of one to start of next)</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor }} />
            <YAxis stroke={axisColor} tick={{ fill: axisColor }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}m`, 'Rest']} />
            <Legend wrapperStyle={{ color: axisColor }} />
            <Line
              type="monotone"
              dataKey="restTime"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 4 }}
              name="Rest Time (minutes)"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
        </>
      )}
    </div>
  );
};

export default ContractionChart;
