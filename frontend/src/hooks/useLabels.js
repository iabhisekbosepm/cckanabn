import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelsApi } from '../api/labels';
import toast from 'react-hot-toast';

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: labelsApi.getAll
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: labelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label created');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => labelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: labelsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Label deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
