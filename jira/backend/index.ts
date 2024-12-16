import { integrationCreate } from './account-settings';
import { syncInitialTasks } from './sync-initial-task';
import { handleWebhook } from './webhook';

export enum IntegrationPayloadEventType {
  /**
   * This is used to identify to which integration account the webhook belongs to
   */
  GET_CONNECTED_ACCOUNT_ID = 'get_connected_account_id',

  SPEC = 'spec',

  /**
   * This is used to create/delete a integration account from the
   * user input
   */
  CREATE = 'create',
  DELETE = 'delete',

  // When the extension gets a external webhook
  SOURCE_WEBHOOK = 'source_webhook',

  // Get a fresh token for the integration
  GET_TOKEN = 'get_token',

  // Valid and return the response for webhooks
  WEBHOOK_RESPONSE = 'webhook_response',

  SYNC_INITIAL_TASK = 'sync_initial_task',
}

export interface IntegrationEventPayload {
  event: IntegrationPayloadEventType;
  [x: string]: any;
}

export const BACKEND_HOST = 'http://localhost:3001/v1';

export async function run(eventPayload: IntegrationEventPayload) {
  switch (eventPayload.event) {
    case IntegrationPayloadEventType.CREATE:
      return await integrationCreate(
        eventPayload.userId,
        eventPayload.workspaceId,
        eventPayload.eventBody,
      );
    case IntegrationPayloadEventType.WEBHOOK_RESPONSE:
      return handleWebhook(eventPayload.eventBody);

    case IntegrationPayloadEventType.SYNC_INITIAL_TASK:
      return syncInitialTasks(eventPayload.eventBody);

    default:
      return {
        message: `The event payload type is ${eventPayload.event}`,
      };
  }
}
