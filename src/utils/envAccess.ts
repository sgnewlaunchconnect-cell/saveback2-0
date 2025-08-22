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
    return getEnvVar("VITE_AUTH_BYPASS") === "true";
  } catch {
    return false;
  }
};