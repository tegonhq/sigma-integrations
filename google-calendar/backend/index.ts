import { integrationCreate } from './account-create';
import { handleTask } from './handle-event';
import { syncInitialTasks } from './sync-initial-task';
import { getAccessToken } from './utils';
import { handleWebhook } from './webhook';

export enum IntegrationPayloadEventType {
  /**
   * This is used to identify to which integration account the webhook belongs to
   */
  GET_CONNECTED_ACCOUNT_ID = 'get_connected_account_id',

  /**
   * This is used to create/delete a integration account from the
   * user input
   */
  CREATE = 'create',
  DELETE = 'delete',

  // Get a fresh token for the integration
  GET_TOKEN = 'get_token',

  SCHEDULED_TASK = 'scheduled_task',

  SYNC_INITIAL_TASK = 'sync_initial_task',

  // When the extension gets a external webhook
  SOURCE_WEBHOOK = 'source_webhook',

  TASK = 'task',
}

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

    case IntegrationPayloadEventType.GET_TOKEN:
      return getAccessToken(eventPayload.eventBody.integrationAccount);

    case IntegrationPayloadEventType.SYNC_INITIAL_TASK:
      return syncInitialTasks(eventPayload.eventBody);

    case IntegrationPayloadEventType.SOURCE_WEBHOOK:
      return await handleWebhook(eventPayload.eventBody);

    case IntegrationPayloadEventType.TASK:
      return await handleTask(eventPayload.eventBody);

    default:
      return {
        message: `The event payload type is ${eventPayload.event}`,
      };
  }
}
