import axios from 'axios';

import { BACKEND_HOST } from './constants';
import { createTasks, getGithubData } from './utils';

export async function syncInitialTasks(eventBody: any) {
  const { integrationAccount } = eventBody;
  const integrationConfiguration = integrationAccount.integrationConfiguration;
  const settings = integrationAccount.settings;

  const queries = [
    `assignee:${settings.login}+type:issue+is:open`,
    `review-requested:${settings.login}+type:pr+is:open`,
    `author:${settings.login}+type:pr+is:open`,
  ];

  const tasks: any = [];

  await Promise.all(
    queries.map(async (query: string) => {
      let page = 1;
      let hasMorePages = true;
      while (hasMorePages) {
        const data = await getGithubData(
          `https://api.github.com/search/issues?page=${page}&per_page=50&q=${query}`,
          integrationConfiguration.access_token,
        );

        // Check if notifications exists and has data
        if (data.items?.length === 0) {
          hasMorePages = false;
          break;
        }

        data.items.map((item: any) => {
          const url = item.url;
          const subject = {
            type: item.node_id.includes('PR') ? 'issue' : 'pullrequest',
          };
          const subjectType = subject.type.toLowerCase();
          const activityType = `github_${subjectType}`;
          const activityName = `${subjectType}: ${item.title}`;
          const sourceId = item.id.toString();
          const status = item.state === 'open' ? 'Todo' : 'Done';
          const title = `#${item.number} - ${item.title}`;

          tasks.push({
            url,
            title,
            status,
            sourceId,
            integrationAccountId: integrationAccount.id,
            metadata: {
              type: 'NORMAL',
              state: item.state,
              number: item.number,
              htmlUrl: item.html_url,
              commentUrl: item.comment_url,
              repository: item.repository_url,
              assignees: item.assignees,
              labels: item.labels,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              closedAt: item.closed_at,
            },
            activity: {
              type: activityType,
              eventData: {
                id: item.id,
                url: item.url,
                comment_url: item.comment_url,
                html_url: item.html_url,
                number: item.number,
                title: item.title,
                state: item.state,
              },
              name: activityName,
              integrationAccountId: integrationAccount.id,
            },
          });

          return true;
        });
        page++;
      }
    }),
  );

  if (tasks.length > 0) {
    await createTasks(tasks, integrationAccount.workspaceId);
  }

  await axios.post(`${BACKEND_HOST}/integration_account/${integrationAccount.id}`, {
    settings: { ...settings, lastSyncTime: new Date().toISOString() },
  });
}
