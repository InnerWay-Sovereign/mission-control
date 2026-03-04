/** @type {import('next').NextConfig} */
function envFlag(name, defaultValue = false) {
  const raw = process.env[name]
  if (raw === undefined || String(raw).trim() === '') return defaultValue
  const normalized = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return defaultValue
}

const nextConfig = {
  output: 'standalone',
  turbopack: {},
  // Transpile ESM-only packages so they resolve correctly in all environments
  transpilePackages: ['react-markdown', 'remark-gfm'],
  
  // Security headers
  async headers() {
    const googleEnabled = !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)
    const hstsEnabled = process.env.NODE_ENV === 'production' && envFlag('MC_ENABLE_HSTS', true)

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline'${googleEnabled ? ' https://accounts.google.com' : ''}`,
      `style-src 'self' 'unsafe-inline'`,
      `connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:*`,
      `img-src 'self' data: blob:${googleEnabled ? ' https://*.googleusercontent.com https://lh3.googleusercontent.com' : ''}`,
      `font-src 'self' data:`,
      `frame-src 'self'${googleEnabled ? ' https://accounts.google.com' : ''}`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `frame-ancestors 'none'`,
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(hstsEnabled ? [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
          ] : []),
        ],
      },
    ];
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      os: false,
      fs: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
