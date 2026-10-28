const withNextIntl = require('next-intl/plugin')();

// The MySafari backend that /api/* is forwarded to (read at build time)
const BACKEND_URL = (process.env.BACKEND_URL || 'https://parcel.mysafari.co.tz').replace(/\/$/, '');

module.exports = withNextIntl({
    reactStrictMode: true,
    // Lets a production build run beside `next dev` (which uses .next)
    distDir: process.env.NEXT_DIST_DIR || '.next',
    // Self-contained server bundle for the Docker image
    output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/api/:path*`,
            },
        ];
    },
});

