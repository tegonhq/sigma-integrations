import axios from 'axios';

import { BACKEND_HOST } from './constants';
import { getState, getTaskBySource } from './utils';

export async function handleWebhook(eventBody: any) {
  const {
    eventData: { eventBody: tegonData },
    integrationAccount,
  } = eventBody;

  switch (tegonData.type) {
    case 'Issue':
      return await handleIssue(tegonData, integrationAccount.id);

    case 'IssueComment':
      return await handleIssueComment(tegonData, integrationAccount.id);

    default:
      return { message: `This type is not handled ${tegonData.type}` };
  }
}

async function handleIssue(tegonData: any, integrationAccountId: string) {
  const issue = tegonData.issue;
  const task = await getTaskBySource(issue.id);
  let taskData;
  if (task) {
    taskData = {
      title: issue.title,
      status: getState(issue.state.category) ?? issue.state.name,
      metadata: {
        type: 'NORMAL',
        ...issue,
      },
      activity: {
        type: tegonData.eventType === 'delete' ? 'issue_delete' : 'issue_update',
        eventData: {
          ...tegonData.changedData,
        },
      },
    };
    return 'updates';
  }
  taskData = {
    url: issue.url,
    title: issue.title,
    status: getState(issue.state.category) ?? issue.state.name,
    sourceId: issue.id,
    integrationAccountId,
    metadata: {
      type: 'NORMAL',
      ...issue,
    },
    activity: {
      type: 'issue_create',
      eventData: {
        ...issue,
      },
    },
  };

  if (task) {
    return await axios.post(`${BACKEND_HOST}/tasks/${task.id}`, taskData);
  }
  return await axios.post(`${BACKEND_HOST}/tasks`, taskData);
}

async function handleIssueComment(tegonData: any, integrationAccountId: string) {
  const issueComment = tegonData.issueComment;
  const task = await getTaskBySource(issueComment.issue.id);

  if (task) {
    const activity = {
      type:
        tegonData.eventType === 'delete'
          ? 'issue_comment_delete'
          : tegonData.eventType === 'create'
            ? 'issue_comment_create'
            : 'issue_comment_update',
      eventData: {
        ...issueComment,
      },
      name: issueComment.bodyMarkdown,
      integrationAccountId,
      taskId: task.id,
    };

    return await axios.post(`${BACKEND_HOST}/activity`, activity);
  }
  return { message: `Task is doesn't exists` };
}
