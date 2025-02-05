import axios from 'axios';

import { BACKEND_HOST } from '.';

export async function getJiraData(url: string, accessToken: string) {
  return (
    await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  ).data;
}

export async function postJira(url: string, accessToken: string, body: any) {
  return (
    await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  ).data;
}

export async function getAccessToken(integrationAccount: any) {
  // Get the integration configuration as a Record<string, string>
  const config = integrationAccount.integrationConfiguration as Record<string, string>;

  // Get the current timestamp
  const currentDate = Date.now();
  // Get the access token expiration timestamp
  const accessExpiresIn = Number(config.access_expires_in);

  // If the access token is expired or not set
  if (!accessExpiresIn || currentDate >= accessExpiresIn) {
    // Get the client ID, client secret, and refresh token from the configuration
    const { refresh_token } = config;
    const { clientId: client_id, clientSecret: client_secret } =
      integrationAccount.integrationDefinition.config;

    const url = 'https://auth.atlassian.com/oauth/token';

    // Send a POST request to refresh the access token
    const { data } = await axios.post(
      url,
      {
        grant_type: 'refresh_token',
        client_id,
        client_secret,
        refresh_token,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    // Response is already JSON, no need to parse
    const tokens = data;

    // Get the new access token expiration time in milliseconds
    const expiresIn = Number(tokens.expires_in) * 1000;

    // Update the configuration with the new refresh token, access token, and expiration times
    config.refresh_token = tokens.refresh_token;
    config.access_token = tokens.access_token;
    config.access_expires_in = (currentDate + expiresIn).toString();

    // Update the integration account in the database with the new configuration
    await axios.post(`${BACKEND_HOST}/integration_account/${integrationAccount.id}`, {
      integrationConfiguration: config,
    });
  }

  return config.access_token;
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

export async function deleteTask(url: string, workspaceId: string) {
  return (await axios.delete(`${BACKEND_HOST}/task/url?workspaceId=${workspaceId}&url=${url}`))
    .data;
}

export function getState(status: Record<string, any>) {
  const categoryKey = status.statusCategory?.key;

  switch (categoryKey) {
    case 'new':
      return 'Todo';
    case 'indeterminate':
      return 'In Progress';
    case 'done':
      return 'Done';
    default:
      return 'Todo'; // Default to Todo if status category is unknown
  }
}
