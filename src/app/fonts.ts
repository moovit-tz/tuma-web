import localFont from "next/font/local";

/**
 * One family for the whole product: Google Sans Flex (variable weight) for display and body, Google Sans Code for mono.
 * Served from the repo (latin subset, from Google Fonts) so builds never depend on reaching fonts.gstatic.com: a
 * timed-out font download used to fail the whole production build.
 */
const sans = localFont({
  src: "./fonts/google-sans-flex-latin.woff2",
  variable: "--font-gsf",
  weight: "1 1000",
  display: "swap",
});
const code = localFont({
  src: "./fonts/google-sans-code-latin.woff2",
  variable: "--font-plex-mono",
  weight: "300 800",
  display: "swap",
});

export const fontVars = `${sans.variable} ${code.variable}`;
