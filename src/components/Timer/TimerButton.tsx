import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import { useContractions } from '../../contexts/ContractionContext';

const TimerButton = () => {
  const { state, startContraction, stopContraction } = useContractions();
  const { timerState } = state;

  const handleClick = () => {
    if (timerState.isRunning) {
      stopContraction();
    } else {
      startContraction();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.button
        onClick={handleClick}
        className={`
          relative w-64 h-64 rounded-full font-bold text-2xl
          tap-highlight-none
          ${timerState.isRunning
            ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
            : 'bg-primary hover:bg-primary-dark active:bg-blue-700'
          }
          text-white shadow-2xl
          transition-colors duration-200
          flex flex-col items-center justify-center
        `}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {timerState.isRunning ? (
          <>
            <Square className="w-12 h-12 mb-2" />
            <span>Stop</span>
            <div className="text-4xl font-mono mt-2">
              {Math.floor(timerState.elapsedTime / 60)}:{(timerState.elapsedTime % 60).toString().padStart(2, '0')}
            </div>
          </>
        ) : (
          <>
            <Play className="w-12 h-12 mb-2 ml-2" />
            <span>Start</span>
            <span className="text-sm font-normal mt-2">Contraction</span>
          </>
        )}
      </motion.button>

      {timerState.isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-slate-600 dark:text-slate-400"
        >
          <p className="text-sm">Tap to stop when contraction ends</p>
        </motion.div>
      )}
    </div>
  );
};

export default TimerButton;
