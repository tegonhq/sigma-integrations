import axios from 'axios';

import { createTasks, getAccessToken, getState, setupAxiosInterceptors } from './utils';

export async function syncInitialTasks(eventBody: any) {
  const { integrationAccount } = eventBody;
  const accessToken = await getAccessToken(integrationAccount);
  const settings = integrationAccount.settings;

  setupAxiosInterceptors(accessToken);

  const teams = (await axios.get(`/api/v1/team/user`)).data;

  const teamsByTeam: Record<string, any> = {};
  for (const team of teams) {
    teamsByTeam[team.id] = team;
  }

  const workflowsByTeam: Record<string, any> = {};
  for (const team of teams) {
    const workflows = (await axios.get(`/api/v1/${team.id}/workflow`)).data;
    for (const workflow of workflows) {
      workflowsByTeam[workflow.id] = workflow;
    }
  }

  const labelsByTeam: Record<string, any> = {};
  for (const team of teams) {
    const labels = (
      await axios.get(`/api/v1/label`, {
        params: {
          workspaceId: settings.workspaceId,
          teamId: team.id,
        },
      })
    ).data;

    for (const label of labels) {
      labelsByTeam[label.id] = label;
    }
  }

  const currentUser = (await axios.get('/api/v1/users')).data;

  const issues = (
    await axios.post(`/api/v1/issue/filter`, {
      workspaceId: settings.workspaceId,
      filters: {
        assignee: {
          filterType: 'IS',
          value: integrationAccount.accountId,
        },
      },
    })
  ).data;

  // Map issues with actual data from workflowsByTeam and labelsByTeam
  const mappedIssues = issues.map((issue: any) => {
    // Map label IDs to actual label objects
    const labels =
      issue.labelIds?.map((labelId: string) => labelsByTeam[labelId]).filter(Boolean) || [];

    const team = teamsByTeam[issue.teamId];
    const url = `https://app.tegon.ai/${team.workspace.slug}/issue/${team.identifier}-${issue.number}`;
    return {
      ...issue,
      url,
      // Map team data
      team,

      // Map state ID with workflow state
      state: workflowsByTeam[issue.stateId],

      // Map assignee ID with current user if it matches
      assignee: issue.assigneeId === currentUser.id ? currentUser.id : issue.assigneeId,

      labels,

      // Ensure other required fields are present
      isBidirectional: issue.isBidirectional || false,
      subscriberIds: issue.subscriberIds || [],
      attachments: issue.attachments || [],
      sourceMetadata: issue.sourceMetadata || null,
      subIssueSortOrder: issue.subIssueSortOrder || null,
      issueSuggestionId: issue.issueSuggestionId || null,
    };
  });

  // Create tasks and activities for each mapped issue in parallel
  const tasks = mappedIssues.map((issue: any) => ({
    url: issue.url,
    title: issue.title,
    status: getState(issue.state.category) ?? issue.state.name,
    sourceId: issue.id,
    integrationAccountId: integrationAccount.id,
    metadata: {
      type: 'NORMAL',
      teamId: issue.teamId,
      teamName: issue.team.name,
      state: issue.state,
      assignee: issue.assignee,
      labels: issue.labels,
      number: issue.number,
    },
    activity: {
      type: 'tegon_issue',
      eventData: {
        ...issue,
      },
    },
  }));

  let createdTasks;
  if (tasks.length > 0) {
    createdTasks = await createTasks(tasks);
  }

  return createdTasks;
}
