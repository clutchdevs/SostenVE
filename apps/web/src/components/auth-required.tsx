import Link from 'next/link';

/** Friendly state shown when a staff page is opened without an active session. */
export function AuthRequired() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-brand">Necesitas iniciar sesión</h1>
      <p className="mt-2 text-slate-600">
        Esta sección es para psicólogos y coordinadores de la Federación.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
