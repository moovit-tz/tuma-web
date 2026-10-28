export const defaultLocale = 'en';
export const locales = ['en', 'sw'] as const;
export type ValidLocale = typeof locales[number];

export const localeNames = {
    en: 'English',
    sw: 'Kiswahili',
} as const;

export const defaultNS = 'common';
export const cookieName = 'i18next';

export function getOptions(lng = defaultLocale, ns = defaultNS) {
    return {
        supportedLngs: locales,
        fallbackLng: defaultLocale,
        lng,
        fallbackNS: defaultNS,
        defaultNS,
        ns,
    }
}