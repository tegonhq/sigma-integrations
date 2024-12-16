import { createActivities, createTasks, getAccessToken, getState, postJira } from './utils';

export async function syncInitialTasks(eventBody: any) {
  const { integrationAccount } = eventBody;

  console.log(integrationAccount);

  const accessToken = await getAccessToken(integrationAccount);

  const settings = integrationAccount.settings;

  console.log(accessToken, settings);

  const tasks: any = [];
  const activities: any = [];

  let nextPageToken = null;
  const maxResults = 50;
  let hasMorePages = true;
  const requestBody: Record<string, any> = {
    jql: 'assignee = currentUser() AND statusCategory != Done',
    fields: ['id', 'key', 'summary', 'status', 'description'],
    maxResults,
  };

  while (hasMorePages) {
    if (nextPageToken) {
      requestBody['nextPageToken'] = nextPageToken;
    }

    const response = await postJira(
      `https://api.atlassian.com/ex/jira/${settings.cloudId}/rest/api/3/search/jql`,
      accessToken,
      requestBody,
    );

    if (!response.issues || response.issues.length === 0) {
      hasMorePages = false;
      break;
    }

    response.issues.forEach((issue: any) => {
      const url = issue.self;
      const title = `${issue.key} - ${issue.fields.summary}`;
      const status = getState(issue.fields.status);
      const sourceId = issue.id;

      tasks.push({
        url,
        title,
        status,
        sourceId,
        integrationAccountId: integrationAccount.id,
      });

      activities.push({
        type: 'jira_issue',
        eventData: {
          id: issue.id,
          key: issue.key,
          url,
          summary: issue.fields.summary,
          status: issue.fields.status,
          description: issue.fields.description,
          html_url: `${settings.url}/browse/${issue.key}`,
        },
        name: title,
        integrationAccountId: integrationAccount.id,
      });
    });

    nextPageToken = response.nextPageToken;
    hasMorePages = !!nextPageToken;
  }

  if (activities.length > 0) {
    await createActivities(activities, integrationAccount.workspaceId);
  }
  if (tasks.length > 0) {
    await createTasks(tasks, integrationAccount.workspaceId);
  }
}
