import type {
  ApiErrorResponse,
  ApiFieldError,
  ApiSuccessResponse
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  details: ApiFieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiFieldError[] = []
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...headers
  };

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData) {
      serializedBody = body;
    } else {
      requestHeaders['Content-Type'] = 'application/json';
      serializedBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'include',
      headers: requestHeaders,
      body: serializedBody,
      signal
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the server. Check your connection and try again.'
    );
  }

  let parsedBody: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      parsedBody = (await response.json()) as
        | ApiSuccessResponse<T>
        | ApiErrorResponse;
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok || (parsedBody && !parsedBody.success)) {
    const errPayload =
      parsedBody && !parsedBody.success ? parsedBody.error : undefined;

    throw new ApiError(
      response.status,
      errPayload?.code || 'REQUEST_FAILED',
      errPayload?.message ||
        'Something went wrong while completing your request. Try again.',
      Array.isArray(errPayload?.details) ? errPayload.details : []
    );
  }

  if (parsedBody && parsedBody.success) {
    return parsedBody.data;
  }

  return undefined as T;
}

export const api = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return apiRequest<T>(path, { method: 'GET', signal });
  },
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return apiRequest<T>(path, { method: 'POST', body, signal });
  },
  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return apiRequest<T>(path, { method: 'PATCH', body, signal });
  },
  delete<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return apiRequest<T>(path, { method: 'DELETE', body, signal });
  }
};
