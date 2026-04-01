/**
 * Extracts a human-readable message from any thrown error.
 *
 * Handles:
 *  - Axios response errors  (err.response.data.message / .error / .errors[])
 *  - express-validator arrays  (err.response.data.errors[0].msg)
 *  - Network errors (no response)
 *  - Plain JS Error objects
 *  - Unknown shapes
 */
export function extractError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;

  // Network offline / no response from server
  if (err.code === "ERR_NETWORK" || !err.response) {
    return "Network error — check your internet connection.";
  }

  const { data, status } = err.response ?? {};

  // express-validator array format: { errors: [{ msg, path }] }
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.msg ?? e.message).filter(Boolean).join(", ");
  }

  // Standard backend format: { message: "..." } or { error: "..." }
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof data?.error   === "string" && data.error)   return data.error;

  // HTTP status fallbacks
  if (status === 400) return "Bad request — please check your input.";
  if (status === 401) return "Session expired. Please log in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "Resource not found.";
  if (status === 409) return "Conflict — this record already exists.";
  if (status === 422) return "Validation failed — please check your input.";
  if (status >= 500)  return "Server error — please try again later.";

  return fallback;
}
