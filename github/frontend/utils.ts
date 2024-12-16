import { PageType, updateTask } from '@tegonhq/sigma-sdk';
import { useMutation } from 'react-query';

interface MutationParams {
  onMutate?: () => void;
  onSuccess?: (data: PageType) => void;
  onError?: (error: string) => void;
}

export function useUpdateTaskMutation({ onMutate, onSuccess, onError }: MutationParams) {
  const onMutationTriggered = () => {
    onMutate && onMutate();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onMutationError = (errorResponse: any) => {
    const errorText = errorResponse?.errors?.message || 'Error occured';

    onError && onError(errorText);
  };

  const onMutationSuccess = (data: PageType) => {
    onSuccess && onSuccess(data);
  };

  return useMutation(updateTask, {
    onError: onMutationError,
    onMutate: onMutationTriggered,
    onSuccess: onMutationSuccess,
  });
}
