import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Contraction } from '../../types/contraction';
import { useContractions } from '../../contexts/ContractionContext';
import { formatDateTime, formatDurationReadable } from '../../utils/dateTime';

interface ContractionItemProps {
  contraction: Contraction;
  index: number;
}

const ContractionItem = ({ contraction, index }: ContractionItemProps) => {
  const { deleteContraction } = useContractions();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this contraction?')) {
      try {
        await deleteContraction(contraction.id);
      } catch (error) {
        console.error('Failed to delete contraction:', error);
        alert('Failed to delete contraction');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="font-semibold text-lg">{formatDateTime(contraction.startTime)}</div>
            {contraction.syncStatus === 'pending' && (
              <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                Pending Sync
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Duration:</span>{' '}
              <span className="font-semibold text-primary">
                {contraction.duration ? formatDurationReadable(contraction.duration) : 'In progress'}
              </span>
            </div>

            {contraction.intensity && (
              <div>
                <span className="text-slate-600 dark:text-slate-400">Intensity:</span>{' '}
                <span className="font-semibold">{contraction.intensity}/10</span>
              </div>
            )}
          </div>

          {contraction.notes && (
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Notes:</span> {contraction.notes}
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            aria-label="Delete contraction"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ContractionItem;
