'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../src/lib/api-client';
import { saveSession } from '../../src/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      const res = await apiFetch<{ token: string; rol: string }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, contrasena: password },
      });
      saveSession(res.token, res.rol);
      router.push(res.rol === 'coordinator' || res.rol === 'admin' ? '/coordinador' : '/psicologo');
    } catch {
      setError('Credenciales inválidas');
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-xl font-bold text-brand">Acceso de personal</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="w-full rounded-md border px-3 py-2"
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-brand px-4 py-2 font-medium text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
