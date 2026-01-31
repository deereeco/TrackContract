import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, TestTube, CheckCircle, XCircle, Share2, Copy, Database, Cloud, HardDrive } from 'lucide-react';
import {
  getGoogleSheetsConfig,
  setGoogleSheetsConfig,
  hasGoogleSheetsConfig,
  getSyncBackend,
  setSyncBackend,
} from '../../services/storage/localStorage';
import { validateGoogleSheetsConfig } from '../../utils/validation';
import { syncEngine } from '../../services/sync/syncEngine';
import { generateShareableUrl } from '../../utils/urlConfig';
import { checkFirebaseConfig } from '../../config/firebase';
import { getShareLink, getUserId } from '../../services/firebase/firestoreClient';
import { migrateFromSheetsToFirebase, type MigrationProgress, type MigrationResult } from '../../services/migration/sheetsToFirebase';
import type { SyncBackend } from '../../types/sync';

const Settings = () => {
  const [backend, setBackendState] = useState<SyncBackend>(getSyncBackend());
  const [config, setConfig] = useState({
    scriptUrl: '',
    sheetName: 'Contractions',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [shareableLink, setShareableLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showBackendConfirm, setShowBackendConfirm] = useState(false);
  const [pendingBackend, setPendingBackend] = useState<SyncBackend | null>(null);

  // Migration state
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    const savedConfig = getGoogleSheetsConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

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

  const handleSave = () => {
    const validationErrors = validateGoogleSheetsConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setGoogleSheetsConfig(config);
    syncEngine.updateConfig(config);
    setErrors([]);
    alert('Settings saved successfully!');
  };

  const handleTest = async () => {
    const validationErrors = validateGoogleSheetsConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setTesting(true);
    setTestResult(null);
    setErrors([]);

    try {
      syncEngine.updateConfig(config);
      const success = await syncEngine.testConnection();

      if (success) {
        setTestResult('success');
        // Try to initialize the sheet
        await syncEngine.initializeSheet();
      } else {
        setTestResult('error');
        setErrors(['Failed to connect to Google Sheets. Check your API key and spreadsheet ID.']);
      }
    } catch (error) {
      setTestResult('error');
      setErrors([error instanceof Error ? error.message : 'Connection test failed']);
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateLink = () => {
    if (backend === 'firebase') {
      const link = getShareLink();
      setShareableLink(link);
    } else if (backend === 'googleSheets') {
      const validationErrors = validateGoogleSheetsConfig(config);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      const link = generateShareableUrl(config);
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

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationProgress(null);
    setMigrationResult(null);
    setErrors([]);

    try {
      const result = await migrateFromSheetsToFirebase((progress) => {
        setMigrationProgress(progress);
      });

      setMigrationResult(result);

      if (result.success) {
        alert(`Migration completed! ${result.migrated} contractions migrated successfully.`);
      } else {
        setErrors(result.errors || ['Migration failed']);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Migration failed']);
    } finally {
      setMigrating(false);
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
              value="googleSheets"
              checked={backend === 'googleSheets'}
              onChange={() => handleBackendChange('googleSheets')}
              className="w-4 h-4"
            />
            <Database className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <div className="font-medium">Google Sheets (Legacy)</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Manual polling, requires Apps Script setup
              </div>
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
            </div>
          </label>
        </div>
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
        </div>
      )}

      {/* Migration Tool */}
      {backend === 'firebase' && firebaseConfigured && hasGoogleSheetsConfig() && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">Migrate from Google Sheets</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Transfer your existing Google Sheets data to Firebase. This will merge with any existing Firebase data.
          </p>

          {!migrating && !migrationResult && (
            <button
              onClick={handleMigrate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Database className="w-5 h-5" />
              Start Migration
            </button>
          )}

          {migrating && migrationProgress && (
            <div className="space-y-2">
              <div className="text-sm font-medium">{migrationProgress.step}</div>
              {migrationProgress.total !== undefined && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${((migrationProgress.current || 0) / migrationProgress.total) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {migrationResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                migrationResult.success
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              {migrationResult.success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    Migration successful! {migrationResult.migrated} contractions migrated.
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Migration failed. Check console for details.</span>
                </>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Google Sheets Configuration */}
      {backend === 'googleSheets' && (
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Google Sheets Configuration</h3>
            <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
              LEGACY
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Apps Script Deployment URL
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.scriptUrl}
              onChange={(e) => setConfig({ ...config, scriptUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Deploy the Apps Script and paste the web app URL here
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Sheet Name
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={config.sheetName}
              onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
              placeholder="e.g., Contractions"
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Name of the sheet tab (default: "Contractions")
            </p>
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

          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                testResult === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Connection successful! Sheet is ready to use.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Connection failed. Please check your settings.</span>
                </>
              )}
            </motion.div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <TestTube className="w-5 h-5" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Shareable Link Section */}
      {((backend === 'firebase' && firebaseConfigured) || (backend === 'googleSheets' && hasGoogleSheetsConfig())) && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Share with Family & Midwife</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                {(() => {
                  if (backend === 'firebase') {
                    return 'Share this link to sync contractions in real-time with others.';
                  } else if (backend === 'googleSheets') {
                    return 'Generate a link that automatically configures the app for others.';
                  } else {
                    return 'Configure a sync backend to enable sharing.';
                  }
                })()}
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
                      <li>
                        {(() => {
                          if (backend === 'firebase') {
                            return 'Everyone sees updates in real-time';
                          } else if (backend === 'googleSheets') {
                            return 'Everyone tracks contractions to the same Google Sheet';
                          } else {
                            return 'Start tracking together';
                          }
                        })()}
                      </li>
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

      {/* Setup Instructions for Google Sheets */}
      {backend === 'googleSheets' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Setup Instructions</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>Create a new Google Sheet</li>
            <li>Open the sheet and go to Extensions &gt; Apps Script</li>
            <li>Copy the code from GoogleAppsScript.js in the project root</li>
            <li>Paste it into the Apps Script editor (replace any existing code)</li>
            <li>Click Deploy &gt; New deployment</li>
            <li>Select type: Web app, Execute as: Me, Who has access: Anyone</li>
            <li>Copy the deployment URL and paste it above</li>
            <li>Test the connection, then save</li>
          </ol>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
            Note: The GoogleAppsScript.js file is in your project root directory
          </p>
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
