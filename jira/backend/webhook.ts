import axios from 'axios';

import { createActivities, createTasks, deleteTask, getAccessToken, getState } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleWebhook(eventBody: any) {
  // Determine activity type and name based on GitHub event
  const {
    eventData: { eventBody: jiraData },
    integrationAccount,
  } = eventBody;
  let activityType = 'jira_event';
  let activityName = 'Jira Event';
  let url: string = '';
  let hasTask: boolean = false;
  let sourceId: string = '';
  let status = 'Todo';
  let title: string = '';
  let activityData: Record<string, any> = {};

  switch (jiraData.webhookEvent) {
    case 'jira:issue_created':
    case 'jira:issue_updated':
    case 'jira:issue_deleted':
      hasTask = true;
      url = jiraData.issue.self;
      title = `${jiraData.issue.key} - ${jiraData.issue.fields.summary}`;
      status = getState(jiraData.issue.fields.status);
      sourceId = jiraData.issue.id;
      activityType = `jira_${jiraData.webhookEvent.split(':')[1]}`;
      activityName = `Jira Issue ${jiraData.webhookEvent.split(':')[1].split('_')[1]}`;
      activityData = jiraData;
      if (activityType === 'jira_issue_deleted') {
        hasTask = false;
        await deleteTask(url, integrationAccount.workspaceId);
      }
      break;

    case 'comment_created':
    case 'comment_updated':
    case 'comment_deleted':
      activityName = `Jira Issue Comment ${jiraData.webhookEvent.split('_')[1]}`;
      activityType = `jira_issue_comment_${jiraData.webhookEvent.split('_')[1]}`;
      activityData = {
        comment: {
          self: jiraData.comment.self,
          id: jiraData.comment.id,
          author: {
            self: jiraData.comment.author.self,
            accountId: jiraData.comment.author.accountId,
            displayName: jiraData.comment.author.displayName,
          },
          body: jiraData.comment.body,
          created: jiraData.comment.created,
          updated: jiraData.comment.updated,
        },
        issue: {
          self: jiraData.issue.self,
          id: jiraData.issue.id,
          key: jiraData.issue.key,
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
