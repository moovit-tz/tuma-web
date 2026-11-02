import { Google_Sans_Code, Google_Sans_Flex } from "next/font/google";

/** One family for the whole product: Google Sans Flex (variable weight) for display and body, Google Sans Code for mono. */
const sans = Google_Sans_Flex({ subsets: ["latin"], variable: "--font-gsf", weight: "variable", display: "swap" });
const code = Google_Sans_Code({ subsets: ["latin"], variable: "--font-plex-mono", weight: "variable", display: "swap" });

export const fontVars = `${sans.variable} ${code.variable}`;
