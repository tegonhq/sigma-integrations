import axios from 'axios';

import { getJiraData, postJira } from './utils';

import { BACKEND_HOST } from '.';

export async function integrationCreate(
  userId: string,
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
) {
  const { oauthResponse, integrationDefinition } = data;
  const integrationConfiguration = {
    refresh_token: oauthResponse.refresh_token,
    access_token: oauthResponse.access_token,
  };

  const accountDetails = await getJiraData(
    `https://api.atlassian.com/oauth/token/accessible-resources`,
    integrationConfiguration.access_token,
  );

  // Get first site from accessible resources
  const site = accountDetails[0];
  const cloudId = site.id;

  const currentUser = await getJiraData(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
    integrationConfiguration.access_token,
  );

  const accountId = currentUser.accountId;

  const webhookData = await postJira(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`,
    integrationConfiguration.access_token,
    {
      url: `https://115d-106-215-173-196.ngrok-free.app/v1/webhook/jira/${accountId}`,
      webhooks: [
        {
          events: [
            'jira:issue_created',
            'jira:issue_updated',
            'jira:issue_deleted',
            'comment_created',
            'comment_updated',
            'comment_deleted',
          ],
          jqlFilter: 'assignee = currentUser()',
        },
      ],
    },
  );

  const settings = {
    name: site.name,
    url: site.url,
    avatarUrl: site.avatarUrl,
    scopes: site.scopes,
    cloudId,
    webhookId: webhookData.webhookRegistrationResult[0].createdWebhookId,
  };

  const payload = {
    settings,
    userId,
    accountId,
    config: integrationConfiguration,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };

  const integrationAccount = (await axios.post(`${BACKEND_HOST}/integration_account`, payload))
    .data;

  return integrationAccount;
}
