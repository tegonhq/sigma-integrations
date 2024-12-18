import { Badge, DueDate, StatusDropdown, TaskType } from '@tegonhq/ui';

import {
  IssueOpenIcon,
  IssueClosedIcon,
  PROpenIcon,
  PRClosedIcon,
  PRDraftIcon,
  PRMergedIcon,
} from '../icons';
import { GitHubIssueMetadata, useUpdateTaskMutation } from '../utils';
interface TaskMetadataProps {
  task: TaskType;
  parsedData: GitHubIssueMetadata | undefined;
}

export const TaskMetadata = ({ task, parsedData }: TaskMetadataProps) => {
  const { mutate: updateTask } = useUpdateTaskMutation({});

  const statusChange = (status: string) => {
    updateTask({
      taskId: task.id,
      status,
    });
  };

  const dueDateChange = (dueDate: Date) => {
    updateTask({
      taskId: task.id,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
    });
  };

  function getType() {
    if (!parsedData) {
      return null;
    }

    const { type, status } = parsedData;
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

    if (type === 'Issue') {
      return (
        <div className="flex items-center gap-2 px-2 h-7 py-1">
          {status === 'closed' ? <IssueClosedIcon size={14} /> : <IssueOpenIcon size={14} />}
          <span>{capitalizedStatus}</span>
        </div>
      );
    }

    // Handle PR icons
    let icon;
    switch (status) {
      case 'draft':
        icon = <PRDraftIcon size={14} />;
        break;
      case 'merged':
        icon = <PRMergedIcon size={14} />;
        break;
      case 'closed':
        icon = <PRClosedIcon size={14} />;
        break;
      default:
        icon = <PROpenIcon size={14} />;
    }

    return (
      <div className="flex items-center gap-2 px-2 h-7 py-1">
        {icon}
        <span>{capitalizedStatus}</span>
      </div>
    );
  }

  return (
    <div className="py-3 flex flex-col gap-2 rounded">
      <div className="flex gap-2 items-center justify-start">
        <div className="label min-w-[100px]">Status</div>
        <StatusDropdown value={task.status} onChange={statusChange} />
      </div>

      <div className="flex gap-2 items-center">
        <div className="label min-w-[100px]">Due date</div>
        <DueDate dueDate={task.dueDate} dueDateChange={dueDateChange} />
      </div>

      {parsedData && (
        <>
          <div className="flex gap-2 items-center">
            <div className="label min-w-[100px]">Repo</div>
            <div className="px-2 py-1 h-7">
              <Badge variant="secondary">{parsedData.repoFullName}</Badge>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="label min-w-[100px]">Type</div>
            <div className="px-2 py-1 h-7">
              <Badge variant="secondary">{parsedData.type}</Badge>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="label min-w-[100px]">Status</div>
            {getType()}
          </div>
        </>
      )}
    </div>
  );
};
