import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales } from './config';

type Messages = { [key: string]: string | Messages };

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    // Lists (and plain strings) replace; only nested objects are merged
    const mergeable = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
    out[key] = mergeable(value) && mergeable(current) ? deepMerge(current as Messages, value as Messages) : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl v4 passes the [locale] segment as `requestLocale` (the old
  // `locale` argument is always undefined, which forced English everywhere)
  let validLocale = (await requestLocale) || defaultLocale;
  
  // Check if the locale is supported, if not use default
  if (!locales.includes(validLocale as any)) {
    validLocale = defaultLocale;
  }
  
  try {
    // Load messages for the locale
    // Any text not translated yet falls back to English instead of showing its key
    const english = (await import(`../messages/${defaultLocale}.json`)).default;
    const localised = validLocale === defaultLocale ? english : (await import(`../messages/${validLocale}.json`)).default;
    const messages = deepMerge(english, localised);
    
    // Return a valid configuration
    return {
      locale: validLocale,
      messages,
      // Set timeZone for proper date/time formatting
      timeZone: 'Africa/Dar_es_Salaam'
    };
  } catch (error) {
    console.error(`Failed to load messages for locale: ${validLocale}`, error);
    
    // Fallback to default messages
    const defaultMessages = (await import(`../messages/${defaultLocale}.json`)).default;
    
    return {
      locale: defaultLocale,
      messages: defaultMessages,
      timeZone: 'Africa/Dar_es_Salaam'
    };
  }
});
