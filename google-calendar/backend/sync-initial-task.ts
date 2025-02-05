import axios from 'axios';

import { createActivities, createTasks, getAccessToken, handleEvent } from './utils';

export async function syncInitialTasks(eventBody: any) {
  const { integrationAccount } = eventBody;
  const accessToken = await getAccessToken(integrationAccount);
  const settings = integrationAccount.settings;

  const tasks: any = [];
  const activities: any = [];

  // Get events from today onwards
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  // Process each calendar from settings
  for (const calendar of settings.calendars) {
    // Skip calendars where user only has "freeBusyReader" access, birthdays or holidays
    if (
      calendar.accessRole === 'freeBusyReader' ||
      calendar.summary === 'Birthdays' ||
      calendar.summary === 'Holidays' ||
      calendar.summary.toLowerCase().includes('holidays')
    ) {
      continue;
    }

    let pageToken = null;
    let hasMorePages = true;

    while (hasMorePages) {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendar.id}/events`);
      const params = {
        timeMin: startTime.toISOString(),
        singleEvents: 'false', // Get recurring events as single instance
        maxResults: '50',
        ...(pageToken && { pageToken }),
      };
      Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, String(value)));

      const response = await axios
        .get(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then((res) => res.data);

      if (!response.items || response.items.length === 0) {
        hasMorePages = false;
        break;
      }

      response.items.forEach(async (event: any) => {
        const activity = await handleEvent(
          event,
          integrationAccount.id,
          calendar.id,
          calendar.summary,
        );

        // Create activity
        activities.push(activity);
      });

      pageToken = response.nextPageToken;
      hasMorePages = !!pageToken;
    }
  }

  if (activities.length > 0) {
    await createActivities(activities);
  }
  if (tasks.length > 0) {
    await createTasks(tasks);
  }
}
