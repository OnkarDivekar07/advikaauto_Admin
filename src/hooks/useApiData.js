import { useState, useEffect, useCallback } from "react";
import { extractError } from "../utils/extractError";

/**
 * useApiData — fires an API call on mount and exposes refresh + loading state.
 *
 * The backend wraps every response in the sendResponse envelope:
 *   { success: true, message: "...", data: <payload>, meta: { timestamp } }
 *
 * Axios puts the full body at res.data, so the actual payload is res.data.data.
 * This hook unwraps that automatically so every consumer gets the payload directly.
 *
 * @param {Function} apiFn    — imported from api/endpoints.js
 * @param {*}        initial  — initial value for `data` (default null)
 */
export function useApiData(apiFn, initial = null) {
  const [data,    setData]    = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null); // human-readable string | null

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn();
      // Unwrap envelope: res.data = { success, message, data: <payload>, meta }
      // Fall back to res.data itself for any endpoint that doesn't use the envelope
      setData(res.data?.data ?? res.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
