import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { REFRESH_TOKEN_MUTATION } from '@/graphql/mutations/auth.mutations';
import { isPermissionError, OPERATION_NOT_PERMITTED_MESSAGE } from '@/lib/graphqlErrors';
import { createCorrelationId, logger } from '@/lib/logger';

const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8000/graphql';

/** Message pattern for "module not enabled" (backend returns GraphQL error with this) */
const MODULE_NOT_ENABLED_PATTERN = /module\s+['"]?(\w+)['"]?\s+is\s+not\s+enabled/i;

/**
 * GraphQL Client with automatic authentication
 * Handles token injection, refresh on 401, and error toasting
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  credentials: 'include', // Send cookies for refresh token (if backend uses them)
});

/**
 * Execute GraphQL request with error handling and auto-retry
 * @param document - GraphQL query/mutation document
 * @param variables - Query/mutation variables
 * @returns Promise with typed response
 */
export async function executeGraphQL<TData = any, TVariables = any>(
  document: string,
  variables?: TVariables
): Promise<TData> {
  const correlationId = createCorrelationId();

  try {
    // Get token from Zustand store and inject into headers
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    headers['X-Correlation-ID'] = correlationId;

    logger.info('GraphQL request', {
      category: 'technical',
      data: {
        correlationId,
        // Best-effort operation name detection without parsing the full document
        operation: document.split(/\s+/).slice(0, 3).join(' '),
      },
    });

    // Execute request
    const data = await graphqlClient.request<TData>({
      document,
      variables: variables as any,
      requestHeaders: headers,
    });

    return data;
  } catch (error: any) {
    logger.error('GraphQL request error', {
      category: 'technical',
      error,
      data: {
        correlationId,
      },
    });

    const isAuthError =
      error.response?.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED' ||
      error.response?.status === 401;

    // Handle authentication errors (401 / UNAUTHENTICATED)
    if (isAuthError) {
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

      // No refresh token available – force logout
      if (!refreshToken) {
        logout();
        toast.error('Session expired. Please log in again.');
        throw new Error('Authentication failed (no refresh token)');
      }

      try {
        // Call refresh mutation directly via graphqlClient (avoid recursion into executeGraphQL)
        const refreshResult = await graphqlClient.request<{
          refresh: { accessToken: string; tokenType: string };
        }>({
          document: REFRESH_TOKEN_MUTATION,
          variables: { refreshToken },
        });

        const newAccessToken = refreshResult?.refresh?.accessToken;

        if (!newAccessToken) {
          // Refresh did not return a new token – treat as failure
          logout();
          toast.error('Session expired. Please log in again.');
          throw new Error('Authentication failed (no new access token)');
        }

        // Store new access token; keep existing refresh token
        setAccessToken(newAccessToken);

        // Retry original request once with new access token
        const retryHeaders: Record<string, string> = {};
        if (newAccessToken) {
          retryHeaders.Authorization = `Bearer ${newAccessToken}`;
        }

        retryHeaders['X-Correlation-ID'] = correlationId;

        const retryData = await graphqlClient.request<TData>({
          document,
          variables: variables as any,
          requestHeaders: retryHeaders,
        });

        return retryData;
      } catch (refreshError: any) {
        // Refresh or retry failed – logout user
        useAuthStore.getState().logout();
        toast.error('Session expired. Please log in again.');
        throw refreshError;
      }
    }

    // Handle "module not enabled" (backend returns this when a disabled module is used)
    const errorMessage = error.response?.errors?.[0]?.message ||
                        error.message ||
                        'An error occurred';
    const moduleNotEnabledMatch = errorMessage.match(MODULE_NOT_ENABLED_PATTERN);
    if (moduleNotEnabledMatch) {
      const moduleId = moduleNotEnabledMatch[1];
      toast.error(`This feature (${moduleId}) is not enabled for your organization.`);
      throw error;
    }

    // Permission/forbidden: show consistent message (no raw backend text)
    if (isPermissionError(error)) {
      toast.error(OPERATION_NOT_PERMITTED_MESSAGE);
      throw error;
    }

    // Do not toast here for other errors (e.g. validation like "Customer code must be unique").
    // Callers (mutation onError, form catch) handle toasting so we avoid duplicate toasts.
    throw error;
  }
}

/**
 * Execute multiple GraphQL requests in parallel
 * Useful for batching independent queries
 */
export async function executeGraphQLBatch<TData = any>(
  requests: Array<{ document: string; variables?: any }>
): Promise<TData[]> {
  return Promise.all(
    requests.map(req => executeGraphQL<TData>(req.document, req.variables))
  );
}
