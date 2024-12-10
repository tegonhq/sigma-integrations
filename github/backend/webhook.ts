// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handle_webhook(eventBody: any) {
  if (eventBody.type === 'url_verification') {
    return { challenge: eventBody.challenge };
  }

  // Determine activity type and name based on GitHub event
  let activityType = 'github_event';
  let activityName = 'GitHub Event';
  let sourceId = '';
  let status = '';
  let title = '';
  let url = '';

  if (eventBody.pull_request) {
    activityType = `github_pull_request_${eventBody.action}`;
    activityName = `PR ${eventBody.action}: ${eventBody.pull_request.title}`;
    sourceId = eventBody.pull_request.id.toString();
    url = eventBody.pull_request.html_url;
    status = eventBody.pull_request.merged ? 'Todo' : 'Done';
    title = `#${eventBody.pull_request.number} - ${eventBody.pull_request.title}`;
  } else if (eventBody.issue) {
    activityType = `github_issue_${eventBody.action}`;
    activityName = `Issue ${eventBody.action}: ${eventBody.issue.title}`;
    sourceId = eventBody.issue.id.toString();
    url = eventBody.issue.html_url;
    status = eventBody.issue.state === 'open' ? 'Todo' : 'Done';
    title = `#${eventBody.issue.number} - ${eventBody.issue.title}`;
  }

  const accountId = eventBody.installation.id.toString();

  const activity = {
    type: activityType,
    name: activityName,
    eventData: eventBody,
  };

  const task = { sourceId, url, status, title };

  return { accountId, activity, task };
}
