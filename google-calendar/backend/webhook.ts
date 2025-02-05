import axios from 'axios';

import { createActivities, getAccessToken, handleEvent, updateOrDeleteTask } from './utils';

export async function handleWebhook(eventBody: any) {
  const {
    eventData: { eventHeaders: headers },
    integrationAccount,
  } = eventBody;

  // Find integration account using the channel token (which we set as calendarId)
  const calendarId = headers['x-goog-channel-token'];

  if (!integrationAccount) {
    console.error(`No integration account found for calendar ${calendarId}`);
    return;
  }

  // Get fresh access token
  const accessToken = await getAccessToken(integrationAccount);

  // Fetch the actual events that changed
  const calendarEventData = await getGoogleCalendarData(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    accessToken,
    {
      updatedMin: new Date(Date.now() - 5 * 60000).toISOString(), // Last 5 minutes
      singleEvents: false,
      orderBy: 'updated',
    },
  );

  if (calendarEventData && calendarEventData.items) {
    const activities = [];
    for (const event of calendarEventData.items) {
      if (event.status === 'cancelled') {
        await updateOrDeleteTask(event, true);
      } else if (event.id.includes('_')) {
        await updateOrDeleteTask(event, false);
      } else {
        const activity = await handleEvent(
          event,
          integrationAccount.id,
          calendarId,
          calendarEventData.summary,
        );
        activities.push(activity);
      }
    }

    await createActivities(activities);
  }
  return { success: true };
}

// Helper function to get events
async function getGoogleCalendarData(
  url: string,
  accessToken: string,
  params: Record<string, any> = {},
) {
  const urlObj = new URL(url);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });

  const response = await axios.get(urlObj.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch calendar data: ${response.statusText}`);
  }

  return response.data;
}
