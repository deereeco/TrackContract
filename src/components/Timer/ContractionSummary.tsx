import { motion } from 'framer-motion';
import { useContractions } from '../../contexts/ContractionContext';
import { calculateStats, calculateRestTime } from '../../utils/calculations';
import { formatTime, formatDurationReadable, formatInterval, formatRestTime } from '../../utils/dateTime';
import { Clock, Activity, TrendingUp, Coffee } from 'lucide-react';

const ContractionSummary = () => {
  const { state } = useContractions();
  const { contractions } = state;

  const stats = calculateStats(contractions);
  const recentThree = stats.recentContractions.slice(0, 3);

  if (recentThree.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 dark:text-slate-400">
        <p>No contractions recorded yet.</p>
        <p className="text-sm mt-2">Tap the button above when a contraction starts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview — 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-center">
          <div className="flex justify-center mb-2">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-center">
          <div className="flex justify-center mb-2">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{formatDurationReadable(stats.averageDuration)}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Avg Duration</div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-center">
          <div className="flex justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{Math.floor(stats.averageInterval / 60)}m</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Avg Apart</div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-center">
          <div className="flex justify-center mb-2">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{Math.floor(stats.averageRestTime / 60)}m</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Avg Rest</div>
        </div>
      </div>

      {/* Recent Contractions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Contractions</h3>
        <div className="space-y-2">
          {recentThree.map((contraction, index) => (
            <motion.div
              key={contraction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{formatTime(contraction.startTime)}</div>
                {contraction.intensity && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Intensity: {contraction.intensity}/10
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-primary">
                  {formatDurationReadable(contraction.duration || 0)}
                </div>
                {index < recentThree.length - 1 && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatInterval(
                      Math.floor((recentThree[index].startTime - recentThree[index + 1].startTime) / 1000)
                    )}
                    <span className="block">
                      {formatRestTime(
                        calculateRestTime(recentThree[index + 1], recentThree[index])
                      )}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContractionSummary;
