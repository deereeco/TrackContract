import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useContractions } from '../../contexts/ContractionContext';

interface ContractionFormProps {
  onClose: () => void;
}

const ContractionForm = ({ onClose }: ContractionFormProps) => {
  const { addManualContraction } = useContractions();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    duration: '',
    intensity: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse date and time
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const startTime = startDateTime.getTime();
      const duration = parseInt(formData.duration, 10);
      const endTime = startTime + duration * 1000;

      await addManualContraction({
        startTime,
        endTime,
        duration,
        intensity: formData.intensity ? parseInt(formData.intensity, 10) : undefined,
        notes: formData.notes || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to add contraction:', error);
      alert('Failed to add contraction');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Contraction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Time</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
            <input
              type="number"
              min="1"
              max="600"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 60"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Typical contractions last 30-90 seconds
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Intensity (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.intensity}
              onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Add Contraction
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ContractionForm;
