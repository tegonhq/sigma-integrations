import axios from 'axios';

import { BACKEND_HOST } from './constants';
import { syncInitialTasks } from './sync-initial-task';
import { getGoogleCalendarData, postGoogleCalendarData } from './utils';

export async function integrationCreate(userId: string, workspaceId: string, data: any) {
  const { oauthResponse, integrationDefinition } = data;
  const integrationConfiguration = {
    refresh_token: oauthResponse.refresh_token,
    access_token: oauthResponse.access_token,
    access_expires_in: oauthResponse.expires_at,
  };

  // Get user's calendar list to store primary calendar info
  const calendarList = await getGoogleCalendarData(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    integrationConfiguration.access_token,
  );

  // Find primary calendar
  const primaryCalendar = calendarList.items.find((calendar: any) => calendar.primary);

  // Map all calendars to a simplified format
  const calendars = calendarList.items.map((calendar: any) => ({
    id: calendar.id,
    summary: calendar.summary,
    primary: calendar.primary || false,
    accessRole: calendar.accessRole,
    backgroundColor: calendar.backgroundColor,
    foregroundColor: calendar.foregroundColor,
  }));

  let settings: Record<string, any> = {
    calendarId: primaryCalendar.id,
    email: primaryCalendar.id,
    timeZone: primaryCalendar.timeZone,
    scheduled: false,
    calendars,
  };

  const payload = {
    settings,
    userId,
    accountId: primaryCalendar.id,
    config: integrationConfiguration,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };

  const integrationAccount = (await axios.post(`${BACKEND_HOST}/integration_account`, payload))
    .data;

  // Set up webhook notification for the primary calendar
  const webhookData = await postGoogleCalendarData(
    `https://www.googleapis.com/calendar/v3/calendars/${primaryCalendar.id}/events/watch`,
    integrationConfiguration.access_token,
    {
      id: `gcal-${userId}-${Date.now()}`, // Unique identifier for this webhook
      type: 'web_hook',
      address: `https://3646-2409-40f0-ff-939e-170-5cb8-7a39-7c69.ngrok-free.app/v1/webhook/google-calendar/${integrationAccount.id}`,
      token: primaryCalendar.id,
    },
  );

  settings = {
    ...settings,
    webhookId: webhookData.id,
    webhookResourceId: webhookData.resourceId,
    webhookExpiration: webhookData.expiration,
  };

  await syncInitialTasks({ integrationAccount });

  return (
    await axios.post(`${BACKEND_HOST}/integration_account/${integrationAccount.id}`, { settings })
  ).data;
}
