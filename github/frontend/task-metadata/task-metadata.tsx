import {
  IntegrationAccount,
  IntegrationAccountWithToken,
  IntegrationDefinition,
  TaskIntegrationViewType,
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

interface TaskMetadataProps {
  task: Task;
  integrationAccount: IntegrationAccount;
  view: TaskIntegrationViewType;
}

export const TaskMetadata = ({ view, integrationAccount }: TaskMetadataProps) => {
  const integrationDefinitionURL = (
    integrationAccount.integrationDefinition as IntegrationDefinition
  )?.url;

  const { data: issueData, refetch } = useGithubIssueDataQuery(
    integrationDefinitionURL as string,
    (integrationAccount as IntegrationAccountWithToken)?.token,
  );
  const size = TaskIntegrationViewType.TASK_LIST_ITEM ? 12 : 16;
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
      return status === 'closed' ? <IssueClosedIcon size={size} /> : <IssueOpenIcon size={size} />;
    }

    // Handle PR icons
    switch (status) {
      case 'draft':
        return <PRDraftIcon size={size} />;
      case 'merged':
        return <PRMergedIcon size={size} />;
      case 'closed':
        return <PRClosedIcon size={size} />;
      default:
        return <PROpenIcon size={size} />;
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1')}>
      {parsedData && (
        <>
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1 shrink min-w-[0px] text-xs',
              view !== TaskIntegrationViewType.TASK_LIST_ITEM && 'h-7 px-2 text-base',
            )}
          >
            {parsedData.repoFullName}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1 shrink min-w-[0px] text-xs',
              view !== TaskIntegrationViewType.TASK_LIST_ITEM && 'h-7 px-2 text-base',
            )}
          >
            {getIcon()}
          </Badge>
        </>
      )}
    </div>
  );
};
