import { useMutation, useQueryClient } from '@tanstack/react-query';
import { columnsApi } from '../api/columns';
import { tasksApi } from '../api/tasks';
import toast from 'react-hot-toast';

// Helper to normalize projectId to string for consistent cache keys
const normalizeId = (id) => String(id);

export function useCreateColumn(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: (data) => columnsApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Column created');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useUpdateColumn(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: ({ id, ...data }) => columnsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Column updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useDeleteColumn(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: columnsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Column deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useReorderColumns(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: (columnIds) => columnsApi.reorderAll(projectId, columnIds),
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: ['project', projectKey] });
      const previous = queryClient.getQueryData(['project', projectKey]);

      queryClient.setQueryData(['project', projectKey], (old) => {
        if (!old) return old;
        const newColumns = columnIds.map((id) =>
          old.columns.find((c) => c.id === id)
        ).filter(Boolean);
        return { ...old, columns: newColumns };
      });

      return { previous };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['project', projectKey], context.previous);
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
    }
  });
}

export function useCreateTask(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: ({ columnId, ...data }) => tasksApi.create(columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task created');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useUpdateTask(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: ({ id, ...data }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useDeleteTask(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useMoveTask(projectId) {
  const queryClient = useQueryClient();
  const projectKey = normalizeId(projectId);

  return useMutation({
    mutationFn: ({ taskId, columnId, position }) =>
      tasksApi.move(taskId, columnId, position),
    onMutate: async ({ taskId, columnId, position }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project', projectKey] });

      // Snapshot the previous value
      const previous = queryClient.getQueryData(['project', projectKey]);

      // Optimistically update
      queryClient.setQueryData(['project', projectKey], (old) => {
        if (!old) return old;

        // Remove task from all columns
        const newColumns = old.columns.map((col) => ({
          ...col,
          tasks: (col.tasks || []).filter((t) => t.id !== taskId)
        }));

        // Find target column
        const targetColIndex = newColumns.findIndex((c) => c.id === columnId);
        if (targetColIndex === -1) return old;

        // Find the task
        const task = old.columns
          .flatMap((c) => c.tasks || [])
          .find((t) => t.id === taskId);

        if (task) {
          const updatedTask = { ...task, column_id: columnId, position };
          // Add to end of target column
          newColumns[targetColIndex].tasks.push(updatedTask);
          // Sort by position
          newColumns[targetColIndex].tasks.sort((a, b) => a.position - b.position);
        }

        return { ...old, columns: newColumns };
      });

      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['project', projectKey], context.previous);
      }
      toast.error(error.message || 'Failed to move task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}
