/**
 * Safe access to environment variables with fallbacks
 */
export const getEnvVar = (key: string, fallback: string = ""): string => {
  try {
    return import.meta.env?.[key] || fallback;
  } catch (error) {
    console.warn(`Failed to access environment variable ${key}:`, error);
    return fallback;
  }
};

export const isAuthBypass = (): boolean => {
  try {
    // Check for demo mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    const isDemoMode = urlParams.get('demo') === '1';
    
    return getEnvVar("VITE_AUTH_BYPASS") === "true" || isDemoMode;
  } catch {
    return false;
  }
};