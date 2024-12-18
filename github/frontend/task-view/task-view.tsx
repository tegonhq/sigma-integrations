import { transformerCopyButton } from '@rehype-pretty/transformers';
import { IntegrationAccountWithToken } from '@tegonhq/sigma-sdk';
import { Button, ScrollArea, Separator } from '@tegonhq/ui';
import React from 'react';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { rehypePrettyCode } from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { parseGitHubIssueData, useGetIntegrationAccount, useGithubIssueDataQuery } from 'utils';

import { TaskMetadata } from './task-metadata';

import './editor.css';

export const TaskView = ({ page, task, pageNode }: any) => {
  const { data: integrationAccount, isLoading } = useGetIntegrationAccount(
    task.integrationAccountId as string,
  );
  const { data: issueData, refetch } = useGithubIssueDataQuery(
    task.url as string,
    (integrationAccount as IntegrationAccountWithToken)?.token,
  );
  const [html, setHtml] = React.useState<string | undefined>(undefined);
  const parsedData = parseGitHubIssueData(issueData, integrationAccount?.settings);

  const processor = unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: 'github-dark',
      transformers: [
        transformerCopyButton({
          visibility: 'always',
          feedbackDuration: 3_000,
        }),
      ],
    })
    .use(rehypeAutolinkHeadings);

  React.useEffect(() => {
    if (integrationAccount) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationAccount]);

  React.useEffect(() => {
    if (parsedData) {
      getHtml();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedData]);

  if (isLoading) {
    return null;
  }

  const getHtml = async () => {
    const htmlContent = (await processor.process(parsedData?.body)).toString();

    setHtml(htmlContent);
  };

  return (
    <>
      <ScrollArea className="flex flex-col gap-2 grow px-4">
        <h2 className="text-xl font-medium">{page?.title}</h2>

        <TaskMetadata task={task} parsedData={parsedData} />
        <Separator />

        {html && (
          <div
            className="github-task-view-container py-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <Separator />
        {pageNode}
      </ScrollArea>

      <div className="border-border border-t p-3 flex justify-end">
        <Button variant="secondary">Open in browser</Button>
      </div>
    </>
  );
};
