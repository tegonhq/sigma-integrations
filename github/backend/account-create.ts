import axios from 'axios';

import { getGithubData } from './utils';

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

  const user = await getGithubData(
    'https://api.github.com/user',
    integrationConfiguration.access_token,
  );

  const payload = {
    settings: {
      login: user.login,
      scheduled: true,
      schedule_frequency: '*/5 * * * *',
    },
    userId,
    accountId: user.id.toString(),
    config: integrationConfiguration,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };
  return (await axios.post(`${BACKEND_HOST}/integration_account`, payload)).data;
}
