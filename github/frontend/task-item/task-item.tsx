import { cn } from '@tegonhq/ui';
import React from 'react';

interface TaskItemProps {
  statusNode: React.ReactNode;
  task: any;
  page: any;
}

export const TaskItem = ({ statusNode, page }: TaskItemProps) => {
  return (
    <div className="pl-1 pr-2 flex group cursor-default gap-2">
      <div className="w-full flex items-center">
        <div
          className={cn(
            'flex grow items-start gap-2 pl-2 ml-1 pr-2 group-hover:bg-grayAlpha-100 rounded-xl shrink min-w-[0px]',
          )}
        >
          <div className="pt-2.5 shrink-0">{statusNode}</div>

          <div
            className={cn('flex flex-col w-full py-2.5 border-b border-border shrink min-w-[0px]')}
          >
            <div className="flex w-full justify-between gap-4">
              <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
                <div className="text-left truncate">{page.title}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pr-1 shrink-0">
                {/* <IssueDueDate dueDate={task.dueDate} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
