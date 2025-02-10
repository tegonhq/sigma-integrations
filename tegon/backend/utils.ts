import axios from 'axios';

import { BACKEND_HOST } from './constants';

export async function getAccessToken(integrationAccount: any) {
  // Get the integration configuration as a Record<string, string>
  const config = integrationAccount.integrationConfiguration as Record<string, string>;

  return config.access_token;
}

export function setupAxiosInterceptors(customToken?: string) {
  axios.interceptors.request.use((axiosConfig) => {
    if (axiosConfig.url?.startsWith('/api')) {
      axiosConfig.url = `http://localhost:3002${axiosConfig.url}`;
    }

    if (!axiosConfig.headers?.Authorization) {
      if (customToken) {
        axiosConfig.headers.Authorization = `Bearer ${customToken}`;
      }
    }

    return axiosConfig;
  });
}

export async function createTasks(tasks: any) {
  const batchSize = 10;
  const results = [];
  const batches = [];

  // Split tasks into batches first
  for (let i = 0; i < tasks.length; i += batchSize) {
    batches.push(tasks.slice(i, i + batchSize));
  }

  // Process all batches concurrently with Promise.all
  try {
    const responses = await Promise.all(
      batches.map((batch, index) =>
        axios.post(`${BACKEND_HOST}/tasks/bulk`, batch).catch((error) => {
          console.error(`Error processing batch ${index + 1}:`, error);
          return { data: [] }; // Return empty data on error to continue processing
        }),
      ),
    );

    // Combine all results
    results.push(...responses.flatMap((response) => response.data));
  } catch (error) {
    console.error('Fatal error processing batches');
    // throw error; // Throw fatal errors
  }

  return results;
}

export async function getTaskBySource(sourceId: string) {
  const response = await axios.get(`${BACKEND_HOST}/tasks/source/${sourceId}`);
  return response.data;
}

export function getState(stateCategory: string) {
  if (stateCategory === 'UNSTARTED') {
    return 'Todo';
  } else if (stateCategory === 'STARTED') {
    return 'In-Progress';
  } else if (stateCategory === 'COMPLETED') {
    return 'Done';
  } else if (stateCategory === 'CANCELLED') {
    return 'Cancelled';
  }

  return undefined;
}
