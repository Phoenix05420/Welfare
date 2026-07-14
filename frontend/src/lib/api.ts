/**
 * API Base Configuration for WelfareIntel
 * Dynamically resolves to the cloud backend URL (e.g., Render, Railway, or Vercel) when deployed,
 * or defaults to http://localhost:8000 for local development.
 */

export const API_BASE_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")
  : "http://localhost:8000";
