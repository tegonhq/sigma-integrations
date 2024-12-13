import axios from 'axios';

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

  const accountDetails = await axios
    .get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        Authorization: `Bearer ${integrationConfiguration.access_token}`,
      },
    })
    .then((response) => response.data);

  // Get first site from accessible resources
  const site = accountDetails[0];
  const accountId = site.id;

  // const currentUser = await axios
  //   .get(`${site.url}/rest/api/3/myself`, {
  //     headers: {
  //       Authorization: `Bearer ${integrationConfiguration.access_token}`,
  //     },
  //   })
  //   .then((response) => response.data);

  const settings = {
    name: site.name,
    url: site.url,
    avatarUrl: site.avatarUrl,
    scopes: site.scopes,
    // userId: currentUser.accountId,
  };

  const payload = {
    settings,
    userId,
    accountId,
    config: integrationConfiguration,
    workspaceId,
    integrationDefinitionId: integrationDefinition.id,
  };

  console.log(payload);
  return await axios.post(`http://localhost:3001/v1/integration_account`, payload, {
    headers: { Authorization: 'Bearer ' },
  });
}
