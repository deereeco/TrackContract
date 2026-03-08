import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Share2, Copy, Download, Upload, RotateCcw, Trash2, LogOut, Pencil, RefreshCw } from 'lucide-react';
import { useUpdate } from '../../contexts/UpdateContext';
import { APP_VERSION } from '../../version';
import { getAllContractions, permanentlyDeleteContraction, batchImportContractions } from '../../services/firebase/firestoreClient';
import { useContractions } from '../../contexts/ContractionContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { getShareLink } from '../../services/firebase/sessionClient';
import type { Contraction } from '../../types/contraction';
import { formatDateTime, formatDurationReadable } from '../../utils/dateTime';

const Settings = () => {
  const { updateAvailable, applyUpdate } = useUpdate();
  const { restoreContraction } = useContractions();
  const { user, signOut, isAnonymous } = useAuth();
  const { activeSession, updateSession } = useSession();

  const [shareableLink, setShareableLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedContractions, setArchivedContractions] = useState<Contraction[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [importing, setImporting] = useState(false);

  const handleGenerateLink = () => {
    if (!activeSession) return;
    setShareableLink(getShareLink(activeSession.shareToken));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch {
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const handleExportData = async () => {
    if (!activeSession) return;
    try {
      const contractions = await getAllContractions(activeSession.id);
      if (contractions.length === 0) {
        alert('No contractions to export.');
        return;
      }
      const exportData = {
        _readme: 'All dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        exportDate: new Date().toISOString(),
        session: activeSession.name,
        sessionId: activeSession.id,
        contractionCount: contractions.length,
        contractions: contractions.map(c => ({
          id: c.id,
          startTime: new Date(c.startTime).toISOString(),
          endTime: c.endTime ? new Date(c.endTime).toISOString() : null,
          duration: c.duration,
          intensity: c.intensity,
          notes: c.notes,
          createdAt: new Date(c.createdAt).toISOString(),
        }))
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contractions-${activeSession.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`Successfully exported ${contractions.length} contractions!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    e.target.value = '';

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data?.contractions) || data.contractions.length === 0) {
        alert('Invalid file: no contractions array found.');
        return;
      }

      const now = Date.now();
      const contractions = data.contractions.map((c: any) => ({
        id: c.id,
        startTime: new Date(c.startTime).getTime(),
        endTime: c.endTime ? new Date(c.endTime).getTime() : null,
        duration: c.duration ?? null,
        intensity: c.intensity,
        notes: c.notes,
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : now,
        updatedAt: now,
        archived: false,
        syncStatus: 'synced' as const,
      }));

      const valid = contractions.filter((c: any) => c.id && !isNaN(c.startTime));
      const invalid = contractions.length - valid.length;

      const { imported, skipped } = await batchImportContractions(valid, activeSession.id);
      const parts = [`Imported ${imported} contraction${imported !== 1 ? 's' : ''}.`];
      if (skipped > 0) parts.push(`${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped.`);
      if (invalid > 0) parts.push(`${invalid} invalid record${invalid !== 1 ? 's' : ''} skipped.`);
      alert(parts.join(' '));
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import data. Make sure the file is a valid export JSON.');
    } finally {
      setImporting(false);
    }
  };

  const handleLoadArchived = async () => {
    if (!activeSession) return;
    setLoadingArchived(true);
    try {
      const allContractions = await getAllContractions(activeSession.id, true);
      setArchivedContractions(allContractions.filter(c => c.archived));
      setShowArchived(true);
    } catch {
      alert('Failed to load archived contractions.');
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleRestoreContraction = async (id: string) => {
    try {
      await restoreContraction(id);
      setArchivedContractions(prev => prev.filter(c => c.id !== id));
      alert('Contraction restored successfully!');
    } catch {
      alert('Failed to restore contraction.');
    }
  };

  const handlePermanentlyDelete = async (id: string) => {
    if (!activeSession || !window.confirm('Permanently delete this contraction? This cannot be undone!')) return;
    try {
      await permanentlyDeleteContraction(id, activeSession.id);
      setArchivedContractions(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete contraction.');
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !activeSession) return;
    await updateSession(activeSession.id, { name: trimmed });
    setEditingName(false);
  };

  const handleSignOut = async () => {
    if (!window.confirm('Sign out? You will need to sign in again to access your sessions.')) return;
    await signOut();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your session and sharing options.
        </p>
      </div>

      {/* App Update */}
      {updateAvailable && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="text-lg font-semibold">App Update Available</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            A new version of the app is ready to install. Your data is safe — updating only refreshes the app.
          </p>
          <button
            onClick={applyUpdate}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Update Now
          </button>
        </div>
      )}

      {/* Session Info */}
      {activeSession && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Current Session</h3>

          <div>
            <label className="block text-sm font-medium mb-1">Session Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg border border-blue-300 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={handleSaveName} className="px-3 py-2 bg-primary text-white rounded-lg text-sm">Save</button>
                <button onClick={() => setEditingName(false)} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{activeSession.name}</span>
                {!isAnonymous && (
                  <button
                    onClick={() => { setNameInput(activeSession.name); setEditingName(true); }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Edit name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Created {formatDateTime(activeSession.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Real-time sync active</span>
          </div>

          {/* Export & Import */}
          {!isAnonymous && (
            <div className="space-y-3">
              <div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export Data to JSON
                </button>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Download all contraction data for this session as a JSON file.
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer w-fit">
                  <Upload className="w-5 h-5" />
                  {importing ? 'Importing...' : 'Import from JSON'}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportData}
                    disabled={importing}
                  />
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Restore contraction data from a previously exported JSON file.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Link */}
      {activeSession && !isAnonymous && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Share with Family & Midwife</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                Share this link so others can view and add contractions in real-time.
              </p>

              {!shareableLink ? (
                <button
                  onClick={handleGenerateLink}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Generate Share Link
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-sm font-mono border border-green-300 dark:border-green-700"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                      {showCopySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium mb-2">How to share:</p>
                    <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                      <li>Copy the link above</li>
                      <li>Send it via text or email</li>
                      <li>They open it and see contractions live</li>
                      <li>They can also add contractions from their device</li>
                    </ol>
                  </div>
                  <button onClick={() => setShareableLink('')} className="text-sm text-green-600 dark:text-green-400 hover:underline">
                    Generate New Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archived Contractions */}
      {activeSession && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Archived Contractions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View and restore contractions that have been archived.
          </p>

          {!showArchived ? (
            <button
              onClick={handleLoadArchived}
              disabled={loadingArchived}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-5 h-5" />
              {loadingArchived ? 'Loading...' : 'View Archived Contractions'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">
                  {archivedContractions.length} archived contraction{archivedContractions.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => setShowArchived(false)} className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
                  Hide
                </button>
              </div>

              {archivedContractions.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">No archived contractions found.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {archivedContractions.map((contraction) => (
                    <motion.div
                      key={contraction.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white dark:bg-slate-700 p-4 rounded-lg flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{formatDateTime(contraction.startTime)}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Duration: {contraction.duration ? formatDurationReadable(contraction.duration) : 'N/A'}
                          {contraction.intensity && ` • Intensity: ${contraction.intensity}/10`}
                        </div>
                        {contraction.notes && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Notes: {contraction.notes}</div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleRestoreContraction(contraction.id)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Restore contraction"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePermanentlyDelete(contraction.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Permanently delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Account */}
      {user && !isAnonymous && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Account</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Signed in as <span className="font-medium">{user.displayName ?? user.email}</span>
          </p>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      )}

      <p className="text-xs text-center text-slate-400 dark:text-slate-600 pt-2">
        Contraction Tracker v{APP_VERSION}
      </p>
    </div>
  );
};

export default Settings;
