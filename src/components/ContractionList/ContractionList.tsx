import { useState } from 'react';
import { Plus, RefreshCw, Archive, Undo, Redo } from 'lucide-react';
import { useContractions } from '../../contexts/ContractionContext';
import { useSync } from '../../contexts/SyncContext';
import ContractionItem from './ContractionItem';
import ContractionForm from './ContractionForm';

const ContractionList = () => {
  const {
    state,
    archiveAllContractions,
    refreshContractions,
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription
  } = useContractions();
  const { contractions, loading } = state;
  const { syncState } = useSync();
  const [showForm, setShowForm] = useState(false);

  const handleArchiveAll = async () => {
    const confirmed = window.confirm(
      `Archive all ${contractions.length} contractions?\n` +
      'They will be hidden from the list but can be restored with Undo.'
    );

    if (confirmed) {
      try {
        await archiveAllContractions();
      } catch (error) {
        console.error('Failed to archive all:', error);
        alert('Failed to archive contractions. Please try again.');
      }
    }
  };

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
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={undoDescription || 'Nothing to undo'}
          >
            <Undo className="w-5 h-5" />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={redoDescription || 'Nothing to redo'}
          >
            <Redo className="w-5 h-5" />
            Redo
          </button>
          <button
            onClick={refreshContractions}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>
      </div>

      {syncState.realtimeEnabled && (
        <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Real-time sync active
        </div>
      )}

      <div className="space-y-2">
        {contractions.map((contraction, index) => (
          <ContractionItem key={contraction.id} contraction={contraction} index={index} />
        ))}
      </div>

      {/* Archive All Section */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleArchiveAll}
          disabled={contractions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Archive className="w-5 h-5" />
          Archive All Contractions
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Archives all contractions (hides them from the list)
        </p>
      </div>

      {showForm && <ContractionForm onClose={() => setShowForm(false)} />}
    </div>
  );
};

export default ContractionList;
