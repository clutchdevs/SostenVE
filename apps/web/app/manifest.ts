import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PPV — Programa de Psicólogos Voluntarios',
    short_name: 'PPV',
    description: 'Apoyo psicológico tras el terremoto · Venezuela',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    lang: 'es-VE',
    icons: [],
  };
}
