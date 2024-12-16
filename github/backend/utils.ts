import axios from 'axios';

import { BACKEND_HOST } from './constants';

export async function createActivity(
  activityName: string,
  activityType: string,
  eventData: Record<string, any>,
  integrationAccountId: string,
) {
  return await axios.post(`${BACKEND_HOST}/activity`, {
    type: activityType,
    eventData,
    name: activityName,
    integrationAccountId,
  });
}

export async function createActivities(activities: any, workspaceId: string) {
  const batchSize = 10; // Increased batch size for better efficiency
  const results = [];
  const batches = [];

  // Split activities into batches first
  for (let i = 0; i < activities.length; i += batchSize) {
    batches.push(activities.slice(i, i + batchSize));
  }

  // Process all batches concurrently with Promise.all
  try {
    const responses = await Promise.all(
      batches.map((batch, index) =>
        axios
          .post(`${BACKEND_HOST}/activity/bulk?workspaceId=${workspaceId}`, batch)
          .catch((error) => {
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

export async function createTask(
  url: string,
  title: string,
  status: string,
  sourceId: string,
  integrationAccountId: string,
) {
  return await axios.post(`${BACKEND_HOST}/tasks`, {
    url,
    title,
    status,
    sourceId,
    integrationAccountId,
  });
}

export async function createTasks(tasks: any, workspaceId: string) {
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
        axios
          .post(`${BACKEND_HOST}/tasks/bulk?workspaceId=${workspaceId}`, batch)
          .catch((error) => {
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

export async function getGithubData(url: string, accessToken: string) {
  return (
    await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  ).data;
}
