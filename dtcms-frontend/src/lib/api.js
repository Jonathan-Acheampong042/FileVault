import { supabase } from "./supabase";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Get auth token from current session
const getAuthToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
};

// Generic API call helper
const apiCall = async (method, endpoint, body = null) => {
  const token = await getAuthToken();

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `API request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

// Convenience methods
export const api = {
  get: (endpoint) => apiCall("GET", endpoint),
  post: (endpoint, body) => apiCall("POST", endpoint, body),
  put: (endpoint, body) => apiCall("PUT", endpoint, body),
  patch: (endpoint, body) => apiCall("PATCH", endpoint, body),
  delete: (endpoint) => apiCall("DELETE", endpoint),
};