import { useContractions } from '../../contexts/ContractionContext';
import { formatDuration } from '../../utils/dateTime';

const TimerDisplay = () => {
  const { state } = useContractions();
  const { timerState } = state;

  if (!timerState.isRunning) return null;

  return (
    <div className="text-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Current Contraction</h3>
      <div className="text-5xl font-mono font-bold text-primary">
        {formatDuration(timerState.elapsedTime)}
      </div>
    </div>
  );
};

export default TimerDisplay;
