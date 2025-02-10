import axios from 'axios';

import { BACKEND_HOST } from './constants';
import { setupAxiosInterceptors } from './utils';

export async function integrationCreate(userId: string, workspaceId: string, data: any) {
  const { config, integrationDefinition } = data;

  setupAxiosInterceptors(config.apiKey);

  const tegonUser = (await axios.get('/api/v1/users')).data;

  const settings: Record<string, any> = {
    workspaces: tegonUser.workspaces,
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
