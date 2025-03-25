import {
  IntegrationAccount,
  IntegrationAccountWithToken,
  IntegrationDefinition,
  Task,
} from '@tegonhq/sigma-sdk';
import { Badge, cn } from '@tegonhq/ui';
import React from 'react';
import { parseGitHubIssueData, useGithubIssueDataQuery } from 'utils';

import {
  IssueOpenIcon,
  IssueClosedIcon,
  PROpenIcon,
  PRClosedIcon,
  PRDraftIcon,
  PRMergedIcon,
} from '../icons';

enum VIEW_TYPE {
  SINGLE_TASK = 'SINGLE_TASK',
  TASK_ITEM = 'TASK_ITEM',
}

interface TaskMetadataProps {
  task: Task;
  integrationAccount: IntegrationAccount;
  view: VIEW_TYPE;
}

export const TaskMetadata = ({ view, integrationAccount }: TaskMetadataProps) => {
  const integrationDefinitionURL = (
    integrationAccount.integrationDefinition as IntegrationDefinition
  )?.url;

  const { data: issueData, refetch } = useGithubIssueDataQuery(
    integrationDefinitionURL as string,
    (integrationAccount as IntegrationAccountWithToken)?.token,
  );

  const parsedData = parseGitHubIssueData(issueData, integrationAccount?.settings);

  React.useEffect(() => {
    if (integrationAccount) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationAccount]);

  function getIcon() {
    if (!parsedData) {
      return null;
    }

    const { type, status } = parsedData;

    if (type === 'Issue') {
      return status === 'closed' ? <IssueClosedIcon size={14} /> : <IssueOpenIcon size={14} />;
    }

    // Handle PR icons
    switch (status) {
      case 'draft':
        return <PRDraftIcon size={14} />;
      case 'merged':
        return <PRMergedIcon size={14} />;
      case 'closed':
        return <PRClosedIcon size={14} />;
      default:
        return <PROpenIcon size={14} />;
    }
  }

  return (
    <div
      className={cn('inline-flex items-center gap-1', view === VIEW_TYPE.TASK_ITEM && 'text-xs')}
    >
      {parsedData && (
        <>
          <Badge variant="secondary" className="flex items-center gap-1">
            {parsedData.repoFullName}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            {getIcon()}
          </Badge>
        </>
      )}
    </div>
  );
};
