import axios from 'axios';

import { createActivities, createTasks, getGithubData } from './utils';

import { BACKEND_HOST } from '.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleSchedule(eventBody: any) {
  const { integrationAccount } = eventBody;
  const integrationConfiguration = integrationAccount.integrationConfiguration;
  const settings = integrationAccount.settings;

  if (!settings?.lastSyncTime) {
    return {
      message: `No last sync time in settings of integration account ${integrationAccount.id}`,
    };
  }

  const lastSyncTime = settings.lastSyncTime;

  const allowedReasons = [
    'assign',
    'review_requested',
    'mention',
    'state_change',
    'subscribed',
    'author',
  ];

  let page = 1;
  let hasMorePages = true;
  let notificationCount = 0;

  while (hasMorePages) {
    const notifications = await getGithubData(
      `https://api.github.com/notifications?page=${page}&per_page=50&all=true&since=${lastSyncTime}`,
      integrationConfiguration.access_token,
    );

    // Check if notifications exists and has data
    if (notifications.length === 0) {
      hasMorePages = false;
      break;
    }
    page++;

    const filteredNotifications = notifications.filter((notification: any) =>
      allowedReasons.includes(notification.reason),
    );

    notificationCount += filteredNotifications?.length || 0;

    const tasks: any = [];
    const activities: any = [];

    await Promise.all(
      filteredNotifications.map(async (notification: any) => {
        const { reason, subject } = notification;

        let url: string = '';
        let activityType: string = '';
        let activityName: string = '';
        let hasTask: boolean = false;
        let sourceId: string = '';
        let status = 'Todo';
        let title: string = '';
        let subjectType: string = '';
        let githubData: Record<string, any> = {};
        switch (reason) {
          case 'mention':
            url = subject.latest_comment_url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}_comment_mention`;
            activityName = `${subjectType} mention: ${subject.title}`;
            hasTask = false;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            break;

          case 'assign':
            url = subject.url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}_assigned`;
            activityName = `${subjectType} Assign: ${subject.title}`;
            hasTask = true;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            sourceId = githubData.id.toString();
            status = githubData.state === 'open' ? 'Todo' : 'Done';
            title = `#${githubData.number} - ${githubData.title}`;
            break;

          case 'review_requested':
            url = subject.url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}_review_requested`;
            activityName = `${subjectType} Review Requested: ${subject.title}`;
            hasTask = true;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            sourceId = githubData.id.toString();
            status = eventBody.merged ? 'Todo' : 'Done';
            title = `#${githubData.number} - ${githubData.title}`;
            break;

          case 'state_change':
            url = subject.url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}_state_change`;
            activityName = `${subjectType} State Changed: ${subject.title}`;
            hasTask = true;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            sourceId = githubData.id.toString();
            status =
              subjectType === 'issue'
                ? githubData.state === 'open'
                  ? 'Todo'
                  : 'Done'
                : eventBody.merged
                  ? 'Todo'
                  : 'Done';
            title = `#${githubData.number} - ${githubData.title}`;
            break;

          case 'subscribed':
            url = subject.url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}`;
            activityName = `${subjectType}: ${subject.title}`;
            hasTask = true;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            sourceId = githubData.id.toString();
            status =
              subjectType === 'issue'
                ? githubData.state === 'open'
                  ? 'Todo'
                  : 'Done'
                : eventBody.merged
                  ? 'Todo'
                  : 'Done';
            title = `#${githubData.number} - ${githubData.title}`;
            break;

          case 'author':
            url = subject.url;
            subjectType = subject.type.toLowerCase();
            activityType = `github_${subjectType}`;
            activityName = `${subjectType}: ${subject.title}`;
            hasTask = true;
            githubData = await getGithubData(url, integrationConfiguration.access_token);
            sourceId = githubData.id.toString();
            status = eventBody.merged ? 'Todo' : 'Done';
            title = `#${githubData.number} - ${githubData.title}`;
            break;

          default:
            break;
        }

        if (url) {
          if (hasTask) {
            tasks.push({
              url,
              title,
              status,
              sourceId,
              integrationAccountId: integrationAccount.id,
            });
          }
          activities.push({
            type: activityType,
            eventData: notification,
            name: activityName,
            integrationAccountId: integrationAccount.id,
          });
        }
      }),
    );

    if (activities.length > 0) {
      await createActivities(activities, integrationAccount.workspaceId);
    }
    if (tasks.length > 0) {
      await createTasks(tasks, integrationAccount.workspaceId);
    }

    await axios.post(`${BACKEND_HOST}/integration_account/${integrationAccount.id}`, {
      settings: { ...settings, lastSyncTime: new Date().toISOString() },
    });
  }

  return { message: `Processed ${notificationCount} notifications from github` };
}
