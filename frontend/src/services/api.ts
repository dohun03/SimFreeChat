type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
  allowNotOk?: boolean;
};

// [핵심] 공통 요청 함수 (내부용)
async function request<T = any>(url: string, opts: ApiOptions = {}): Promise<T | null> {
  const isJsonBody = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData);

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: isJsonBody ? JSON.stringify(opts.body) : opts.body,
    credentials: opts.credentials ?? 'include',
  });

  if (!res.ok) {
    if (opts.allowNotOk) return null;
    
    const text = await res.text().catch(() => '');
    let errorMessage = `HTTP ${res.status}`;

    try {
      const errorObj = JSON.parse(text);
      if (errorObj.message) {
        errorMessage = Array.isArray(errorObj.message) 
          ? errorObj.message[0] 
          : errorObj.message;
      }
    } catch {
      errorMessage = text || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  
  const resultText = await res.text();
  return (resultText || null) as T;
}

// [수출] 외부에서 사용할 함수들

export async function apiGet<T = any>(url: string, opts: ApiOptions = {}) {
  return request<T>(url, { ...opts, method: 'GET' });
}

export async function apiPost<T = any>(url: string, body?: any, opts: ApiOptions = {}) {
  return request<T>(url, { ...opts, method: 'POST', body });
}

export async function apiPatch<T = any>(url: string, body?: any, opts: ApiOptions = {}) {
  return request<T>(url, { ...opts, method: 'PATCH', body });
}

export async function apiDelete<T = any>(url: string, opts: ApiOptions = {}) {
  return request<T>(url, { ...opts, method: 'DELETE' });
}