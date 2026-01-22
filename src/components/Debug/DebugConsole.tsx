import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface LogEntry {
  timestamp: number;
  type: 'log' | 'error' | 'warn';
  message: string;
}

const DebugConsole = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        type: 'log',
        message: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      }]);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        type: 'error',
        message: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      }]);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        type: 'warn',
        message: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      }]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Show console with 4 taps on bottom-right corner
  useEffect(() => {
    let tapCount = 0;
    let tapTimer: number;

    const handleTap = (e: TouchEvent) => {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const isBottomRight = x > window.innerWidth - 100 && y > window.innerHeight - 100;

      if (isBottomRight) {
        tapCount++;
        clearTimeout(tapTimer);

        if (tapCount === 4) {
          setIsOpen(true);
          tapCount = 0;
        }

        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1000);
      }
    };

    window.addEventListener('touchstart', handleTap);
    return () => window.removeEventListener('touchstart', handleTap);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <h2 className="text-white font-bold">Debug Console</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setLogs([])}
            className="p-2 text-white hover:bg-slate-700 rounded"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-white hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-slate-400">No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${
                log.type === 'error'
                  ? 'bg-red-900/30 text-red-300'
                  : log.type === 'warn'
                  ? 'bg-yellow-900/30 text-yellow-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs text-slate-500 mb-1">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <pre className="whitespace-pre-wrap break-all">{log.message}</pre>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-800 p-2 text-center text-xs text-slate-400 border-t border-slate-700">
        Tap bottom-right corner 4x to toggle • {logs.length} logs
      </div>
    </div>
  );
};

export default DebugConsole;
