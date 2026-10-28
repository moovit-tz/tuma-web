#!/usr/bin/env node
/**
 * Guards against the exact regression the design audit found: raw brand-color
 * hex literals and Tailwind's default amber/indigo/blue palette reintroduced
 * as page-level "brand" colors instead of the --primary/--secondary tokens.
 *
 * Run: node scripts/check-brand-colors.mjs
 * Exits non-zero (and lists offending file:line) if any are found.
 */
import { readFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"

// Legacy/duplicate brand hexes that should always route through tokens.
const BANNED_HEX = [/#f0c808/i, /#ffd428/i, /#242a37/i]
// Tailwind's default amber/blue/indigo palette used as a stand-in for the
// brand's primary/secondary — legitimate elsewhere (charts, semantic status
// colors already have their own tokens), so this only flags amber, which has
// no legitimate non-brand use in this codebase.
const BANNED_UTILITY = /\b(?:bg|text|border|from|via|to|ring|shadow)-amber-\d{2,3}\b/g

const files = execSync('git ls-files "src/**/*.tsx" "src/**/*.ts"', { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  // globals.css token declarations and this script's own patterns are exempt.
  .filter((f) => !f.includes("globals.css") && !f.includes("check-brand-colors"))
  // working tree can be mid-rename/case-change relative to the index; skip those.
  .filter((f) => existsSync(f))

let violations = 0

for (const file of files) {
  const text = readFileSync(file, "utf8")
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    if (BANNED_HEX.some((re) => re.test(line))) {
      console.error(`${file}:${i + 1}  raw brand hex — use bg-primary / bg-secondary / var(--primary) instead`)
      violations++
    }
    if (BANNED_UTILITY.test(line)) {
      console.error(`${file}:${i + 1}  amber-* utility — use bg-primary / text-primary instead`)
      violations++
    }
  })
}

if (violations > 0) {
  console.error(`\n${violations} brand-color violation(s) found. See design-audit "Color" section.`)
  process.exit(1)
} else {
  console.log("No raw brand-color hex or amber-* utilities found.")
}
