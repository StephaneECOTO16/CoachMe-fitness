/**
 * API Utility Functions
 * Centralizes API URL configuration and provides helper functions for API calls
 */

/**
 * Get the base API URL from environment variables
 * Returns empty string for relative paths in development
 */
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || '';
};

/**
 * Build a complete API endpoint URL
 * @param path - The API path (e.g., '/api/auth/login')
 * @returns Complete URL for the API endpoint
 */
export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Make an authenticated API request
 * @param path - The API path
 * @param options - Fetch options
 * @returns Response from the API
 */
export const fetchApi = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(path);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Error response interface
 */
export interface ApiError {
  code?: string;
  message: string;
  details?: unknown;
}

/**
 * Success response interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Parse API response and handle errors
 * @param response - Fetch response
 * @returns Parsed JSON data
 */
export const handleApiResponse = async <T = unknown>(
  response: Response
): Promise<ApiResponse<T>> => {
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: {
        code: data.error?.code || `HTTP_${response.status}`,
        message: data.error?.message || data.message || 'An error occurred',
        details: data.error?.details,
      },
    };
  }

  return {
    success: true,
    data: data.data || data,
  };
};
