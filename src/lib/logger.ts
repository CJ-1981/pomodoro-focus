/**
 * Simple logger that only prints in non-production environments.
 */
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    // Keep warnings in production to help with debugging
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // We usually keep errors even in production
    console.error(...args);
  }
};
