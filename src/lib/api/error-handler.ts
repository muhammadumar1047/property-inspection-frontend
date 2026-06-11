import { AxiosError } from 'axios';
import { ApiResponse } from '@/types/api';

/**
 * Extract a user-safe error message from any error thrown during an API call.
 *
 * Priority:
 * 1. Backend ApiResponse.message (from response body, regardless of HTTP status)
 * 2. Axios error message (network failures)
 * 3. Generic fallback
 *
 * This ensures system/internal errors, stack traces, and raw exception messages
 * are NEVER shown to the user.
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
    if (error instanceof AxiosError) {
        // Case 1: Backend returned a response with an ApiResponse body
        const data = error.response?.data;
        if (data && typeof data === 'object' && 'message' in data) {
            const msg = (data as { message?: string }).message;
            if (msg && typeof msg === 'string' && msg.trim().length > 0) {
                // Sanitize: never expose stack traces or internal exception details
                const sanitized = sanitizeMessage(msg);
                if (sanitized) return sanitized;
            }
        }

        // Case 2: Network error (no response)
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }

        // Case 3: HTTP error with no useful body
        const status = error.response?.status;
        if (status === 401) return 'Invalid email or password. Please try again.';
        if (status === 403) return 'You do not have permission to perform this action.';
        if (status === 429) return 'Too many requests. Please wait a moment and try again.';
        if (status && status >= 500) return 'A server error occurred. Please try again later.';
    }

    // Case 4: Generic JS Error
    if (error instanceof Error) {
        // Don't expose raw error.message if it looks like a system error
        const msg = error.message || '';
        if (msg.includes('stack trace') || msg.includes('Exception') || msg.includes(' at ')) {
            return fallback;
        }
        // Network error message from fetch
        if (msg === 'Failed to fetch') {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }
        return msg || fallback;
    }

    return fallback;
}

/**
 * Strip any internal/technical content from error messages.
 * Returns null if the message should be replaced entirely.
 */
function sanitizeMessage(message: string): string | null {
    // Reject messages that contain stack traces or internal exception details
    if (
        message.includes('Stack Trace') ||
        message.includes('StackTrace') ||
        message.includes('at ') && message.includes(' in ') ||
        message.includes('Internal Server Error:') ||
        message.includes('Exception:')
    ) {
        return null; // caller should use fallback
    }

    // Identity error messages may leak implementation details — sanitize them
    if (message.startsWith('Identity Error:') || message.startsWith('Identity Exception:')) {
        return 'Unable to process the request. Please try again.';
    }

    return message;
}