import { motion } from 'framer-motion';

interface IntensityPromptProps {
  isOpen: boolean;
  onSubmit: (intensity: number) => void;
  onSkip: () => void;
}

const IntensityPrompt = ({ isOpen, onSubmit, onSkip }: IntensityPromptProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Contraction Intensity</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Rate the intensity of this contraction (1-10)
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((intensity) => (
            <button
              key={intensity}
              onClick={() => onSubmit(intensity)}
              className="aspect-square px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-lg transition-colors font-semibold text-lg"
            >
              {intensity}
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          Skip
        </button>
      </motion.div>
    </div>
  );
};

export default IntensityPrompt;
