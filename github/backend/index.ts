import { IntegrationPayloadEventType } from '@tegonhq/sigma-sdk';

import { integrationCreate } from './account-create';
import { handleSchedule } from './schedule';
import { syncInitialTasks } from './sync-initial-task';

export interface IntegrationEventPayload {
  event: IntegrationPayloadEventType;
  [x: string]: any;
}

export async function run(eventPayload: IntegrationEventPayload) {
  switch (eventPayload.event) {
    case IntegrationPayloadEventType.CREATE:
      return await integrationCreate(
        eventPayload.userId,
        eventPayload.workspaceId,
        eventPayload.eventBody,
      );

    case IntegrationPayloadEventType.SCHEDULED_TASK:
      return handleSchedule(eventPayload.eventBody);

    case IntegrationPayloadEventType.GET_TOKEN:
      return eventPayload.eventBody.integrationAccount.integrationConfiguration.access_token;

    case IntegrationPayloadEventType.SYNC_INITIAL_TASK:
      return syncInitialTasks(eventPayload.eventBody);

    default:
      return {
        message: `The event payload type is ${eventPayload.event}`,
      };
  }
}
