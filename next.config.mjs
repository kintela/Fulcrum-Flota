/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para asegurar que las rutas dinámicas y estáticas coexistan correctamente
  // Esto ayuda a que /empleados/nuevo y /empleados/[id] funcionen sin conflictos
  async rewrites() {
    return [
      {
        source: '/empleados/nuevo',
        destination: '/empleados/nuevo',
      },
    ]
  },
};

export default nextConfig;
