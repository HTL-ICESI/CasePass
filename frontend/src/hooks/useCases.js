import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { buildMockCase, buildMockCases } from '../lib/mockData';

export function useCases() {
  return useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/cases');
        return data;
      } catch (_error) {
        return buildMockCases();
      }
    },
  });
}

export function useCase(caseId) {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/cases/${caseId}`);
        return data;
      } catch (_error) {
        return buildMockCase({ id: caseId });
      }
    },
    enabled: Boolean(caseId),
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      try {
        const { data } = await api.post('/cases', payload);
        return data;
      } catch (_error) {
        return buildMockCase({
          id: globalThis.crypto?.randomUUID?.() || `local-case-${Date.now()}`,
          ...payload,
        });
      }
    },
    onSuccess: (createdCase) => {
      queryClient.setQueryData(['cases'], (current = buildMockCases()) => [
        createdCase,
        ...current.filter((caseItem) => caseItem.id !== createdCase.id),
      ]);
      queryClient.setQueryData(['case', createdCase.id], createdCase);
    },
  });
}

export function useUpdateCase(caseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      try {
        const { data } = await api.put(`/cases/${caseId}`, payload);
        return data;
      } catch (_error) {
        return buildMockCase({ id: caseId, ...payload, updated_at: new Date().toISOString() });
      }
    },
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(['cases'], (current = buildMockCases()) => current.map((caseItem) => (
        caseItem.id === updatedCase.id ? { ...caseItem, ...updatedCase } : caseItem
      )));
      queryClient.setQueryData(['case', caseId], updatedCase);
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId) => {
      try {
        const { data } = await api.delete(`/cases/${caseId}`);
        return data;
      } catch (_error) {
        return { success: true, id: caseId };
      }
    },
    onSuccess: (_result, caseId) => {
      queryClient.setQueryData(['cases'], (current = buildMockCases()) => current.filter((caseItem) => caseItem.id !== caseId));
      queryClient.removeQueries({ queryKey: ['case', caseId] });
    },
  });
}
