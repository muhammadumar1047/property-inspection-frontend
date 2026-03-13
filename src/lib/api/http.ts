import axios from 'axios';

//const API_BASE_URL = 'http://localhost:5066/api';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://ec2-54-66-59-41.ap-southeast-2.compute.amazonaws.com:8080/api';

// Global auth timeout handler
// This allows the AuthContext to register a handler that will be called
// when authentication errors (401/403) are detected by the HTTP interceptor
let authTimeoutHandler: (() => void) | null = null;

export const setAuthTimeoutHandler = (handler: () => void) => {
  authTimeoutHandler = handler;
};




// Shared axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach Authorization header from localStorage token
api.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }

      // Central agency scoping behavior:
      // - SuperAdmin: send agencyId ONLY via query (GET/DELETE) or body (POST/PUT/PATCH). Never via headers.
      // - Non-SuperAdmin: never send agencyId anywhere (backend resolves automatically).
      try {
        config.headers = config.headers || {};
        delete (config.headers as any).AgencyId;
        delete (config.headers as any).agencyId;

        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const isSuperAdmin = !!(user && (user.isSuperAdmin || user.IsSuperAdmin));

        const selectedAgencyId = localStorage.getItem('impersonatedAgencyId');
        const method = (config.method || 'get').toString().toLowerCase();

        // Handle both URL query strings and axios `params`
        const rawUrl = (config.url || '').toString();
        const [pathPart, queryPart] = rawUrl.split('?');
        const path = pathPart || '';
        const urlParams = new URLSearchParams(queryPart || '');

        const stripAgencyIdFromParamsObject = () => {
          const p: any = (config as any).params;
          if (!p || typeof p !== 'object') return;
          delete p.agencyId;
          delete p.AgencyId;
        };

        const injectAgencyIdIntoParamsObject = (agencyId: string) => {
          const p: any = (config as any).params;
          if (!p) {
            (config as any).params = { agencyId };
            return;
          }
          if (typeof p === 'object') {
            p.agencyId = agencyId;
            delete p.AgencyId;
          }
        };

        const stripAgencyIdFromUrl = () => {
          urlParams.delete('agencyId');
          const qs = urlParams.toString();
          config.url = qs ? `${path}?${qs}` : path;
        };

        const injectAgencyIdIntoUrl = (agencyId: string) => {
          urlParams.set('agencyId', String(agencyId));
          config.url = `${path}?${urlParams.toString()}`;
        };

        const stripAgencyIdFromBody = () => {
          const data: any = (config as any).data;
          if (!data) return;
          if (typeof FormData !== 'undefined' && data instanceof FormData) {
            data.delete('agencyId');
            data.delete('AgencyId');
            return;
          }
          if (typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              if (parsed && typeof parsed === 'object') {
                delete (parsed as any).agencyId;
                delete (parsed as any).AgencyId;
                (config as any).data = JSON.stringify(parsed);
              }
            } catch {
              // ignore non-JSON strings
            }
            return;
          }
          if (data && typeof data === 'object') {
            delete data.agencyId;
            delete data.AgencyId;
          }
        };

        const injectAgencyIdIntoBody = (agencyId: string) => {
          const data: any = (config as any).data;
          if (!data) {
            (config as any).data = { agencyId };
            return;
          }
          if (typeof FormData !== 'undefined' && data instanceof FormData) {
            if (!data.has('agencyId') && !data.has('AgencyId')) data.set('agencyId', String(agencyId));
            return;
          }
          if (typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              if (parsed && typeof parsed === 'object') {
                if (!('agencyId' in parsed) && !('AgencyId' in parsed)) {
                  (parsed as any).agencyId = agencyId;
                }
                (config as any).data = JSON.stringify(parsed);
              }
            } catch {
              // ignore non-JSON strings
            }
            return;
          }
          if (data && typeof data === 'object') {
            if (!('agencyId' in data) && !('AgencyId' in data)) {
              data.agencyId = agencyId;
            }
          }
        };

        if (!isSuperAdmin) {
          stripAgencyIdFromUrl();
          stripAgencyIdFromParamsObject();
          stripAgencyIdFromBody();
        } else if (selectedAgencyId) {
          if (method === 'get' || method === 'delete') {
            injectAgencyIdIntoUrl(selectedAgencyId);
            injectAgencyIdIntoParamsObject(selectedAgencyId);
          } else if (method === 'post' || method === 'put' || method === 'patch') {
            stripAgencyIdFromUrl();
            stripAgencyIdFromParamsObject();
            injectAgencyIdIntoBody(selectedAgencyId);
          }
        }
      } catch {
        // no-op: never block requests due to agency scoping injection issues
      }
    }
  } catch { }
  return config;
});

api.interceptors.response.use(
  (response) => {
    try {
      const data = response?.data;
      if (data && typeof data === 'object' && 'success' in data) {
        if ((data as any).success === false) {
          const err = new Error((data as any).message || 'Request failed');
          (err as any).response = response;
          return Promise.reject(err);
        }
      }
    } catch {
      // no-op
    }
    return response;
  },
  (error) => {
    const data = error?.response?.data;
    const status = error?.response?.status;
    const url = error?.config?.url;
    let message: any = data || error.message || 'Request failed';
    if (data && typeof data === 'object' && Object.keys(data).length === 0) {
      message = `HTTP ${status ?? ''} at ${url ?? ''}`.trim();
    }
    console.error('API Error:', message);

    // Handle authentication errors (401, 403) by automatically redirecting to login
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Authentication error detected:', error.response?.status);

      // Use the global auth timeout handler if available
      if (authTimeoutHandler) {
        authTimeoutHandler();
      } else {
        // Fallback: Clear user data and redirect
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;








