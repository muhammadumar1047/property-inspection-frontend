export const getBaseUrl = (): string => {
  // Check if an explicit environment variable is set.
  // Next.js static replacement supports NEXT_PUBLIC_ prefixes.
  // We also try REACT_APP_BASE_URL (which might be passed in Node environments or via custom config).
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.REACT_APP_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Dynamic detection when running in the browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Default fallback based on environment
  if (process.env.NODE_ENV === 'production') {
    return 'http://ec2-52-62-164-129.ap-southeast-2.compute.amazonaws.com:3000';
  }

  return 'http://localhost:3000';
};
