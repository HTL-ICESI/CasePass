import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { buildMockUser, buildMockUsers } from '../lib/mockData';

export default function Admin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', role: 'user' });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/users');
        return data;
      } catch (_error) {
        return buildMockUsers();
      }
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload) => {
      try {
        const { data } = await api.post('/users', payload);
        return data;
      } catch (_error) {
        return buildMockUser(payload.email || 'nuevo@casepass.local', {
          id: globalThis.crypto?.randomUUID?.() || `local-user-${Date.now()}`,
          name: payload.name || 'Usuario local',
          role: payload.role || 'user',
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: (createdUser) => {
      queryClient.setQueryData(['users'], (current = buildMockUsers()) => [
        ...current.filter((user) => user.id !== createdUser.id),
        createdUser,
      ]);
      setForm({ name: '', email: '', role: 'user' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }) => {
      try {
        const { data } = await api.put(`/users/${id}/active`, { active });
        return data;
      } catch (_error) {
        return { id, active };
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['users'], (current = buildMockUsers()) => current.map((user) => (
        user.id === result.id ? { ...user, active: result.active } : user
      )));
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 shadow-docket backdrop-blur">
        <p className="text-xs uppercase tracking-legal text-cyan-200/75">Administracion</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Usuarios del sistema</h1>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          createUser.mutate(form);
        }}
        className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 md:grid-cols-4"
      >
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" className="rounded-[1.25rem] border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-300/45" />
        <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Correo" className="rounded-[1.25rem] border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-300/45" />
        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="rounded-[1.25rem] border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-300/45">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Crear usuario</button>
      </form>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-slate-950/65 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-200">
            {usersQuery.data?.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => toggleActive.mutate({ id: user.id, active: !user.active })} className="rounded-full border border-white/10 px-3 py-1 text-xs transition hover:border-cyan-200/45 hover:text-cyan-100">
                    {user.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
