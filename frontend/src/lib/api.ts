/**
 * API Base Configuration for WelfareIntel
 * Dynamically resolves to the cloud backend URL (e.g., Railway or Vercel) when deployed,
 * or defaults to http://localhost:8000 for local development.
 */

const getBaseUrl = () => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL;
    if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
  }
  if ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.PROD) || (typeof process !== "undefined" && process.env && process.env.VERCEL)) {
    return "https://welfare-production.up.railway.app";
  }
  return "http://localhost:8000";
};

export const API_BASE_URL = getBaseUrl().replace(/\/+$/, "");
