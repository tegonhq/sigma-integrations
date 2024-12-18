import { IntegrationAccountWithToken } from '@tegonhq/sigma-sdk';
import {
  cn,
  TaskDueDate,
  StatusDropdown,
  StatusDropdownVariant,
  TaskItemProps,
  Badge,
} from '@tegonhq/ui';
import React from 'react';
import {
  parseGitHubIssueData,
  useGetIntegrationAccount,
  useGithubIssueDataQuery,
  useUpdateTaskMutation,
} from 'utils';

import {
  IssueOpenIcon,
  IssueClosedIcon,
  PROpenIcon,
  PRClosedIcon,
  PRDraftIcon,
  PRMergedIcon,
} from '../icons';

export const TaskItem = ({ task, page }: TaskItemProps) => {
  const { mutate: updateTask } = useUpdateTaskMutation({});
  const { data: integrationAccount, isLoading } = useGetIntegrationAccount(
    task.integrationAccountId as string,
  );
  const { data: issueData, refetch } = useGithubIssueDataQuery(
    task.url as string,
    (integrationAccount as IntegrationAccountWithToken)?.token,
  );

  const statusChange = (status: string) => {
    updateTask({
      taskId: task.id,
      status,
    });
  };

  const parsedData = parseGitHubIssueData(issueData, integrationAccount?.settings);

  React.useEffect(() => {
    if (integrationAccount) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationAccount]);

  if (isLoading) {
    return null;
  }

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
    <div className="pl-1 flex group cursor-default gap-2">
      <div className="w-full flex items-center">
        <div
          className={cn(
            'flex grow items-start gap-2 pl-2 ml-1 pr-2 group-hover:bg-grayAlpha-100 rounded-xl shrink min-w-[0px]',
          )}
        >
          <div className="pt-2.5 shrink-0">
            <StatusDropdown
              value={task.status}
              onChange={statusChange}
              variant={StatusDropdownVariant.NO_BACKGROUND}
            />
          </div>

          <div
            className={cn('flex flex-col w-full py-2.5 border-b border-border shrink min-w-[0px]')}
          >
            <div className="flex w-full justify-between gap-4">
              <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
                <div className="text-left truncate">{page?.title}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pr-1 shrink-0">
                <TaskDueDate dueDate={task.dueDate} />
                <div className="inline-flex items-center gap-1 text-xs">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
