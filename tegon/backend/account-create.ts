import axios from 'axios';

import { BACKEND_HOST, TEGON_HOST } from './constants';

export async function integrationCreate(userId: string, workspaceId: string, data: any) {
  const { config, integrationDefinition } = data;

  const tegonUser = (
    await axios.get(`${TEGON_HOST}/api/v1/users`, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    })
  ).data;

  const settings: Record<string, any> = {
    workspaces: tegonUser.workspaces.map(({ id, name, slug }: any) => ({ id, name, slug })),
    workspaceId: tegonUser.workspaces[0].id,
  };

  const payload = {
    settings,
    userId,
    accountId: tegonUser.id,
    config,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };

  return (await axios.post(`${BACKEND_HOST}/integration_account`, payload)).data;
}
