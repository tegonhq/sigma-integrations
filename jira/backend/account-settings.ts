import axios from 'axios';

import { getJiraData } from './utils';

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

  console.log(integrationConfiguration);

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

  const settings = {
    name: site.name,
    url: site.url,
    avatarUrl: site.avatarUrl,
    scopes: site.scopes,
    cloudId,
  };

  const payload = {
    settings,
    userId,
    accountId,
    config: integrationConfiguration,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };

  return (await axios.post(`${BACKEND_HOST}/integration_account`, payload)).data;
}
