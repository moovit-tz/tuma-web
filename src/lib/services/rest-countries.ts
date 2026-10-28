export interface RestCountry {
    name: {
        common: string
        official: string
    }
    cca2: string
    capital?: string[]
    region: string
    subregion?: string
    population: number
    flags: {
        png: string
        svg: string
        alt?: string
    }
    timezones: string[]
    continents: string[]
}

// restcountries.com is a public, unauthenticated third-party API used only
// for cosmetic enrichment (flags, population). It's routinely blocked by
// ad-blockers, privacy extensions, and corporate networks — that's expected,
// not an application error, so failures here are quiet and bounded rather
// than logged as errors or left to hang indefinitely.
const FETCH_TIMEOUT_MS = 4000

async function fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
        return await fetch(url, { signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

export async function getRestCountryData(name: string): Promise<RestCountry | null> {
    let searchTerm = name.toLowerCase().trim()
    let isFullText = true

    // Handle Democratic Republic of the Congo (DRC) - API specifies full official name
    // Enforce DRC for all "Congo" searches as per system requirements
    if (searchTerm === "drc" || searchTerm === "dr congo" || searchTerm === "congo dr" ||
        searchTerm === "democratic republic of congo" || searchTerm === "congo") {
        searchTerm = "democratic republic of the congo"
    }

    // Handle Zanzibar - bundled under Tanzania in global APIs
    if (searchTerm === "zanzibar") {
        searchTerm = "tanzania"
    }

    try {
        const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(searchTerm)}${isFullText ? "?fullText=true" : ""}`
        const response = await fetchWithTimeout(url)

        if (!response.ok) {
            // Fallback for broader searches if fullText failed
            if (isFullText) {
                const retryUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(searchTerm)}`
                const retryResponse = await fetchWithTimeout(retryUrl)
                if (retryResponse.ok) {
                    const data = await retryResponse.json()
                    return data[0] || null
                }
            }
            return null
        }

        const data = await response.json()
        return data[0] || null
    } catch (error) {
        console.warn("[RestCountries] Lookup unavailable (flags/details won't show for this entry):", error)
        return null
    }
}

let restCountriesCache: RestCountry[] | null = null
// Once the API proves unreachable this session, stop retrying it — every
// getRegions()/getCountries() call would otherwise re-attempt and re-log it.
let restCountriesUnavailable = false

export async function getAllRestCountries(): Promise<RestCountry[]> {
    if (restCountriesCache) return restCountriesCache
    if (restCountriesUnavailable) return []

    try {
        const response = await fetchWithTimeout(
            "https://restcountries.com/v3.1/all?fields=name,cca2,flags,population,region,subregion,capital,timezones,continents"
        )
        if (!response.ok) {
            restCountriesUnavailable = true
            return []
        }
        const data = await response.json()
        restCountriesCache = data
        return data
    } catch (error) {
        restCountriesUnavailable = true
        console.warn("[RestCountries] Unreachable this session — flags/population will be omitted:", error)
        return []
    }
}
