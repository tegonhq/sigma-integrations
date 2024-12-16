import { TaskTitle, TaskViewProps } from '@tegonhq/ui';

export const TaskView = ({ page }: TaskViewProps) => {
  const onChange = () => {};

  return (
    <div className="flex flex-col gap-2">
      <div>
        <TaskTitle value={page.title as string} onChange={onChange} />
      </div>
    </div>
  );
};
