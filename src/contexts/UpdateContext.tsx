import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Workbox } from 'workbox-window';

interface UpdateContextValue {
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextValue>({
  updateAvailable: false,
  applyUpdate: () => {},
});

export const useUpdate = () => useContext(UpdateContext);

export const UpdateProvider = ({ children }: { children: React.ReactNode }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const workbox = new Workbox('/TrackContract/sw.js');
      workbox.addEventListener('waiting', () => setUpdateAvailable(true));
      workbox.register();
      setWb(workbox);
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (wb) {
      wb.messageSkipWaiting();
      wb.addEventListener('controlling', () => window.location.reload());
    } else {
      window.location.reload();
    }
  }, [wb]);

  return (
    <UpdateContext.Provider value={{ updateAvailable, applyUpdate }}>
      {children}
    </UpdateContext.Provider>
  );
};
