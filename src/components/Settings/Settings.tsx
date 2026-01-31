import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Share2, Copy, Cloud, HardDrive, Download } from 'lucide-react';
import {
  getSyncBackend,
  setSyncBackend,
} from '../../services/storage/localStorage';
import { checkFirebaseConfig } from '../../config/firebase';
import { getShareLink, getUserId, getAllContractions } from '../../services/firebase/firestoreClient';
import type { SyncBackend } from '../../types/sync';

const Settings = () => {
  const [backend, setBackendState] = useState<SyncBackend>(getSyncBackend());
  const [shareableLink, setShareableLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showBackendConfirm, setShowBackendConfirm] = useState(false);
  const [pendingBackend, setPendingBackend] = useState<SyncBackend | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleBackendChange = (newBackend: SyncBackend) => {
    if (newBackend === backend) return;

    // Firebase requires configuration
    if (newBackend === 'firebase' && !checkFirebaseConfig()) {
      setErrors(['Firebase is not configured. Please add Firebase credentials to .env file.']);
      return;
    }

    // Show confirmation dialog
    setPendingBackend(newBackend);
    setShowBackendConfirm(true);
  };

  const confirmBackendChange = () => {
    if (!pendingBackend) return;

    setSyncBackend(pendingBackend);
    setBackendState(pendingBackend);
    setPendingBackend(null);
    setShowBackendConfirm(false);
    setErrors([]);

    // Reload page to reinitialize contexts
    window.location.reload();
  };

  const cancelBackendChange = () => {
    setPendingBackend(null);
    setShowBackendConfirm(false);
  };

  const handleGenerateLink = () => {
    if (backend === 'firebase') {
      const link = getShareLink();
      setShareableLink(link);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const handleExportData = async () => {
    try {
      if (backend !== 'firebase') {
        alert('Export is only available when using Firebase backend.');
        return;
      }

      // Get all contractions from Firebase
      const contractions = await getAllContractions();

      if (contractions.length === 0) {
        alert('No contractions to export.');
        return;
      }

      // Create export object
      const exportData = {
        _readme: 'All dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        exportDate: new Date().toISOString(),
        userId: getUserId(),
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

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download file
      const link = document.createElement('a');
      link.href = url;
      link.download = `contractions-export-${new Date().toISOString().split('T')[0]}.json`;
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

  const firebaseConfigured = checkFirebaseConfig();
  const firebaseUserId = backend === 'firebase' ? getUserId() : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure sync backend and sharing options.
        </p>
      </div>

      {/* Backend Selector */}
      <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Sync Backend</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose how to sync your contraction data across devices.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all">
            <input
              type="radio"
              name="backend"
              value="firebase"
              checked={backend === 'firebase'}
              onChange={() => handleBackendChange('firebase')}
              disabled={!firebaseConfigured}
              className="w-4 h-4"
            />
            <Cloud className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <div className="font-medium">Firebase (Recommended)</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Real-time sync, automatic conflict resolution, works offline
              </div>
              {!firebaseConfigured && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Not configured - add credentials to .env file
                </div>
              )}
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all">
            <input
              type="radio"
              name="backend"
              value="none"
              checked={backend === 'none'}
              onChange={() => handleBackendChange('none')}
              className="w-4 h-4"
            />
            <HardDrive className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <div className="font-medium">Local Only</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                No sync, data stays on this device only
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Warning: Data will be lost on page refresh
              </div>
            </div>
          </label>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Backend Change Confirmation */}
      {showBackendConfirm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-2">Confirm Backend Change</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            Changing the sync backend will reload the app. Your local data will be preserved.
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmBackendChange}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Confirm Change
            </button>
            <button
              onClick={cancelBackendChange}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Firebase Configuration */}
      {backend === 'firebase' && firebaseConfigured && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Firebase Configuration</h3>

          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <input
              type="text"
              value={firebaseUserId || 'Loading...'}
              readOnly
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg font-mono text-sm"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              This ID identifies your data in Firebase. Share the link below to sync with others.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Real-time sync active</span>
          </div>

          <div>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Export Data to JSON
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Download all your contraction data as a JSON file for backup or analysis.
            </p>
          </div>
        </div>
      )}

      {/* Shareable Link Section */}
      {backend === 'firebase' && firebaseConfigured && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Share with Family & Midwife</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                Share this link to sync contractions in real-time with others.
              </p>

              {!shareableLink ? (
                <button
                  onClick={handleGenerateLink}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Generate Shareable Link
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
                      <li>Send it to your partner, midwife, or family via text/email</li>
                      <li>They click the link and the app auto-configures</li>
                      <li>Everyone sees updates in real-time</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => setShareableLink('')}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    Generate New Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Firebase Setup Instructions */}
      {!firebaseConfigured && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Firebase Setup Instructions</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Firebase Console</a></li>
            <li>Create a new project or use an existing one</li>
            <li>Enable Firestore Database (production mode)</li>
            <li>Register a web app in Project Settings</li>
            <li>Copy the Firebase config credentials</li>
            <li>Add them to the <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.env</code> file in your project root</li>
            <li>Restart the development server</li>
          </ol>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
            See <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">.env.example</code> for required variables
          </p>
        </div>
      )}
    </div>
  );
};

export default Settings;
