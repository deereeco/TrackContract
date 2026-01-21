import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useContractions } from '../../contexts/ContractionContext';
import ContractionItem from './ContractionItem';
import ContractionForm from './ContractionForm';

const ContractionList = () => {
  const { state } = useContractions();
  const { contractions, loading } = state;
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="text-slate-500 dark:text-slate-400">Loading contractions...</div>
      </div>
    );
  }

  if (contractions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-500 dark:text-slate-400 mb-4">No contractions recorded yet.</p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Manual Entry
        </button>
        {showForm && <ContractionForm onClose={() => setShowForm(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">All Contractions ({contractions.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {contractions.map((contraction, index) => (
          <ContractionItem key={contraction.id} contraction={contraction} index={index} />
        ))}
      </div>

      {showForm && <ContractionForm onClose={() => setShowForm(false)} />}
    </div>
  );
};

export default ContractionList;
