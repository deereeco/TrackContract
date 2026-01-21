import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { getGoogleSheetsConfig, setGoogleSheetsConfig } from '../../services/storage/localStorage';
import { validateGoogleSheetsConfig, extractSpreadsheetId } from '../../utils/validation';
import { syncEngine } from '../../services/sync/syncEngine';

const Settings = () => {
  const [config, setConfig] = useState({
    apiKey: '',
    spreadsheetId: '',
    sheetName: 'Contractions',
  });
  const [sheetUrl, setSheetUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const savedConfig = getGoogleSheetsConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleSheetUrlChange = (url: string) => {
    setSheetUrl(url);
    const spreadsheetId = extractSpreadsheetId(url);
    if (spreadsheetId) {
      setConfig({ ...config, spreadsheetId });
    }
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
            API Key
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="Enter your Google API key"
            className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create an API key in Google Cloud Console with Sheets API enabled
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Google Sheet URL
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => handleSheetUrlChange(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Paste the full URL of your Google Sheet
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

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Setup Instructions</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>Create a new Google Sheet</li>
          <li>Share it publicly or with specific people</li>
          <li>Go to Google Cloud Console and create a project</li>
          <li>Enable the Google Sheets API</li>
          <li>Create an API key (restrict to Sheets API)</li>
          <li>Copy the API key and Sheet URL above</li>
          <li>Test the connection, then save</li>
        </ol>
      </div>
    </div>
  );
};

export default Settings;
