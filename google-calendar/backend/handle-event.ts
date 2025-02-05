import axios from 'axios';

import { BACKEND_HOST } from './constants';
import { getAccessToken } from './utils';

export async function handleTask(eventBody: any) {
  const { integrationAccount, task, type } = eventBody;

  const accessToken = await getAccessToken(integrationAccount);

  const integrationSettings = integrationAccount.settings;

  const calendarId = integrationSettings.calendarId;

  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  const url = new URL(type === 'create' ? baseUrl : `${baseUrl}/${task.sourceId}`);
  url.searchParams.append('sendUpdates', 'none');

  const eventData = {
    start: {
      dateTime: task.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: task.endTime,
      timeZone: 'UTC',
    },
    summary: task.page.title,
    recurrence: task.recurrence,
    status: type === 'delete' || task.status === 'Cancelled' ? 'cancelled' : 'confirmed',
  };

  let event;
  if (type === 'create') {
    event = (
      await axios.post(url.toString(), eventData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    ).data;
  } else {
    event = (
      await axios.put(url.toString(), eventData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    ).data;
  }

  if (type === 'create') {
    await axios.post(`${BACKEND_HOST}/tasks/${task.id}`, {
      url: event.htmlLink,
      sourceId: event.id,
    });
  }

  return { status: 200 };
}
