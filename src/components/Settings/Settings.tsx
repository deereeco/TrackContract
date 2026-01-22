import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, TestTube, CheckCircle, XCircle, Share2, Copy } from 'lucide-react';
import { getGoogleSheetsConfig, setGoogleSheetsConfig, hasGoogleSheetsConfig } from '../../services/storage/localStorage';
import { validateGoogleSheetsConfig } from '../../utils/validation';
import { syncEngine } from '../../services/sync/syncEngine';
import { generateShareableUrl } from '../../utils/urlConfig';

const Settings = () => {
  const [config, setConfig] = useState({
    scriptUrl: '',
    sheetName: 'Contractions',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [shareableLink, setShareableLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    const savedConfig = getGoogleSheetsConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

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
    const validationErrors = validateGoogleSheetsConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const link = generateShareableUrl(config);
    setShareableLink(link);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure Google Sheets sync to share contraction data with family and midwife.
        </p>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Google Sheets Configuration</h3>

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

      {/* Shareable Link Section */}
      {hasGoogleSheetsConfig() && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Share with Family & Midwife</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                Generate a link that automatically configures the app for others. They just click and start using it - no setup needed!
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
                      <li>Everyone tracks contractions to the same Google Sheet</li>
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
    </div>
  );
};

export default Settings;
