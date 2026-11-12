/**
 * Where Ondi sends people back after sign-in. Must match a redirect URI registered on the Ondi client exactly.
 * Default /api/auth/callback (the production client); set ONDI_REDIRECT_PATH=/auth/callback for a client
 * registered with that path (e.g. a local-development client at http://localhost:3100/auth/callback).
 */
export const ONDI_REDIRECT_PATH = process.env.ONDI_REDIRECT_PATH || "/api/auth/callback";
export const ondiRedirectUri = () => new URL(ONDI_REDIRECT_PATH, process.env.APP_URL).toString();
