import { GoogleSheetsConfig } from '../types/sync';
import { setGoogleSheetsConfig } from '../services/storage/localStorage';

/**
 * Encode configuration into a URL-safe base64 string
 */
export const encodeConfig = (config: GoogleSheetsConfig): string => {
  const json = JSON.stringify(config);
  return btoa(json); // base64 encode
};

/**
 * Decode configuration from a URL-safe base64 string
 */
export const decodeConfig = (encoded: string): GoogleSheetsConfig | null => {
  try {
    const json = atob(encoded); // base64 decode
    return JSON.parse(json) as GoogleSheetsConfig;
  } catch (error) {
    console.error('Failed to decode config:', error);
    return null;
  }
};

/**
 * Generate a shareable URL with embedded configuration
 */
export const generateShareableUrl = (config: GoogleSheetsConfig): string => {
  const baseUrl = window.location.origin + window.location.pathname;
  const encoded = encodeConfig(config);
  return `${baseUrl}#config=${encoded}`;
};

/**
 * Check URL for configuration and auto-configure if present
 * Returns true if configuration was found and applied
 */
export const checkAndApplyUrlConfig = (): boolean => {
  const hash = window.location.hash;

  if (!hash || !hash.includes('config=')) {
    return false;
  }

  try {
    // Extract config parameter from hash
    const params = new URLSearchParams(hash.substring(1)); // Remove # and parse
    const encoded = params.get('config');

    if (!encoded) {
      return false;
    }

    // Decode and apply configuration
    const config = decodeConfig(encoded);
    if (config) {
      setGoogleSheetsConfig(config);

      // Clear the hash to hide credentials from URL bar
      window.history.replaceState(null, '', window.location.pathname);

      return true;
    }
  } catch (error) {
    console.error('Failed to apply URL config:', error);
  }

  return false;
};
