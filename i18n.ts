import {getRequestConfig} from 'next-intl/server';
import {locales} from './i18n.config';

export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale as any)) {
    return {};
  }

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});