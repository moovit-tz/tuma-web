import createMiddleware from 'next-intl/middleware';

export const locales = ['en', 'sw'];
export const defaultLocale = 'en';

// Export configuration that is used in middleware.ts and app/[locale]
export const i18nConfig = {
    locales,
    defaultLocale,
    localeDetection: false,
    localePrefix: 'always'
};

// Create and export middleware configuration
export default createMiddleware(i18nConfig);