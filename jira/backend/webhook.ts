import axios from 'axios';

import { createActivities, createTasks, deleteTask, getAccessToken, getState } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleWebhook(eventBody: any) {
  // Determine activity type and name based on GitHub event
  const { eventData, integrationAccount } = eventBody;
  let activityType = 'jira_event';
  let activityName = 'Jira Event';
  let url: string = '';
  let hasTask: boolean = false;
  let sourceId: string = '';
  let status = 'Todo';
  let title: string = '';
  let activityData: Record<string, any> = {};

  switch (eventData.webhookEvent) {
    case 'jira:issue_created':
    case 'jira:issue_updated':
    case 'jira:issue_deleted':
      hasTask = true;
      url = eventData.issue.self;
      title = `${eventData.issue.key} - ${eventData.issue.fields.summary}`;
      status = getState(eventData.issue.fields.status);
      sourceId = eventData.issue.id;
      activityType = `jira_${eventData.webhookEvent.split(':')[1]}`;
      activityName = `Jira Issue ${eventData.webhookEvent.split(':')[1].split('_')[1]}`;
      activityData = eventData;
      if (activityType === 'jira_issue_deleted') {
        hasTask = false;
        await deleteTask(url, integrationAccount.workspaceId);
      }
      break;

    case 'comment_created':
    case 'comment_updated':
    case 'comment_deleted':
      activityName = `Jira Issue Comment ${eventData.webhookEvent.split('_')[1]}`;
      activityType = `jira_issue_comment_${eventData.webhookEvent.split('_')[1]}`;
      activityData = {
        comment: {
          self: eventData.comment.self,
          id: eventData.comment.id,
          author: {
            self: eventData.comment.author.self,
            accountId: eventData.comment.author.accountId,
            displayName: eventData.comment.author.displayName,
          },
          body: eventData.comment.body,
          created: eventData.comment.created,
          updated: eventData.comment.updated,
        },
        issue: {
          self: eventData.issue.self,
          id: eventData.issue.id,
          key: eventData.issue.key,
        },
      };
      break;
  }

  const activities = await createActivities(
    [
      {
        type: activityType,
        name: activityName,
        eventData: activityData,
        integrationAccountId: integrationAccount.id,
      },
    ],
    integrationAccount.workspaceId,
  );

  let tasks;
  if (hasTask) {
    tasks = await createTasks(
      [{ url, title, status, sourceId, integrationAccountId: integrationAccount.id }],
      integrationAccount.workspaceId,
    );
  }

  const settings = integrationAccount.settings;

  const accessToken = await getAccessToken(integrationAccount);
  await axios.put(
    `https://api.atlassian.com/ex/jira/${settings.cloudId}/rest/api/3/webhook/refresh`,
    {
      webhookIds: [settings.webhookId],
    },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return { activities, tasks };
}
