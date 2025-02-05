import axios from 'axios';

import { BACKEND_HOST } from './constants';

export async function getGoogleCalendarData(url: string, accessToken: string) {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

export async function postGoogleCalendarData(url: string, accessToken: string, data: any) {
  const response = await axios.post(url, data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
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

    const url = 'https://oauth2.googleapis.com/token';

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
    config.access_token = tokens.access_token;
    config.access_expires_in = (currentDate + expiresIn).toString();

    // Update the integration account in the database with the new configuration
    await axios.post(`${BACKEND_HOST}/integration_account/${integrationAccount.id}`, {
      integrationConfiguration: config,
    });
  }

  return config.access_token;
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

export async function createActivities(activities: any) {
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
        axios.post(`${BACKEND_HOST}/activity/bulk`, batch).catch((error) => {
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

export async function getTaskOccurenceByFilter(query: any) {
  const response = await axios.get(`${BACKEND_HOST}/task-occurence/filter`, {
    params: query,
  });

  return response.data;
}

export async function updateOrDeleteTask(event: any, isCancelled: boolean = false) {
  const { id: sourceId, status } = event;

  const [originalId, rTimestamp] = sourceId.split('_');

  // Get the original task first
  const task = await getTaskBySource(originalId);
  if (!task) {
    return null;
  }

  // Handle cancellation of entire recurring series
  if (status === 'cancelled' && !rTimestamp) {
    await axios.delete(`${BACKEND_HOST}/tasks/${task.id}`);
    return null;
  }

  // Handle single instance of recurring event
  if (rTimestamp && task.recurrence?.length > 0) {
    const targetStartDate = new Date(event.originalStartTime.dateTime);

    // Check for existing occurrence first to avoid unnecessary processing
    const [existingOccurrence] = await getTaskOccurenceByFilter({
      taskId: task.id,
      startTime: targetStartDate.toISOString(),
      startTimeFilter: 'eq',
    });

    let occurenceBody;
    if (isCancelled) {
      const taskStarttime = new Date(task.startTime);
      const taskEndtime = new Date(task.endTime);
      occurenceBody = {
        taskId: task.id,
        startTime: targetStartDate.toISOString(),
        endTime: new Date(
          targetStartDate.getTime() + (taskEndtime.getTime() - taskStarttime.getTime()),
        ).toISOString(),
        status: 'Cancelled',
      };
    } else {
      occurenceBody = {
        taskId: task.id,
        startTime: new Date(event.start.dateTime).toISOString(),
        endTime: new Date(event.end.dateTime).toISOString(),
        status: isCancelled ? 'Cancelled' : 'Todo',
      };
    }

    // Update or create occurrence
    return await axios.post(
      `${BACKEND_HOST}/task-occurence${existingOccurrence ? `/${existingOccurrence.id}` : ''}`,
      occurenceBody,
    );
  }

  // Handle updates to the main recurring event
  if (!rTimestamp && !isCancelled) {
    // Update the main task with new date
    const updateBody = {
      startTime: new Date(event.start.dateTime).toISOString(),
      endTime: new Date(event.end.dateTime).toISOString(),
      recurrence: event.recurrence || [],
      metadata: {
        type: event.recurrence ? 'SCHEDULED' : 'NORMAL',
        isRecurring: !!event.recurrence,
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        timeZone: event.start.timeZone,
        recurrence: event.recurrence,
        recurringEventId: event.recurringEventId,
        calendarId: task.metadata.calendarId,
        calendarName: task.metadata.calendarName,
      },
    };

    return await axios.post(`${BACKEND_HOST}/tasks/${task.id}`, updateBody);
  }

  // Handle non-recurring event cancellation
  if (isCancelled) {
    return await axios.delete(`${BACKEND_HOST}/tasks/source/${sourceId}`);
  }

  return undefined;
}

export async function handleEvent(
  event: any,
  integrationAccountId: string,
  calendarId: string,
  calendarName: string,
) {
  const task = await getTaskBySource(event.id);

  if (task) {
    await updateOrDeleteTask(event, false);
  } else {
    const task = {
      url: event.htmlLink,
      title: event.summary,
      status: 'Todo',
      sourceId: event.id,
      integrationAccountId,
      recurrence: event.recurrence,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      metadata: {
        type: event.recurrence ? 'SCHEDULED' : 'NORMAL',
        isRecurring: !!event.recurrence,
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        timeZone: event.start.timeZone,
        recurrence: event.recurrence,
        recurringEventId: event.recurringEventId,
        calendarId,
        calendarName,
      },
    };

    await axios.post(`${BACKEND_HOST}/tasks`, task);
  }

  const activity = {
    type: 'google_calendar_event',
    eventData: {
      id: event.id,
      status: event.status,
      htmlLink: event.htmlLink,
      created: event.created,
      updated: event.updated,
      summary: event.summary,
      description: event.description,
      location: event.location,
      creator: event.creator,
      organizer: event.organizer,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence,
      recurringEventId: event.recurringEventId,
      attendees: event.attendees,
      calendarId,
      calendarName,
    },
    name: event.summary,
    integrationAccountId,
  };

  return activity;
}
