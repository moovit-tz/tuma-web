/**
 * Map over items running at most `limit` async calls at a time, preserving
 * input order in the result.
 *
 * Browsers allow only ~6 concurrent connections per host, shared by every
 * tab on the app. Fanning out one request per item with a bare Promise.all
 * occupies all of them, so every other request (page scripts included)
 * queues behind the fan-out and the app appears frozen.
 */
export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
    signal?: AbortSignal,
): Promise<R[]> {
    const results = new Array<R>(items.length)
    let next = 0
    const worker = async () => {
        while (next < items.length && !signal?.aborted) {
            const index = next++
            results[index] = await fn(items[index], index)
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
    return results
}

/**
 * Shared cap on concurrent calls across every caller, unlike
 * mapWithConcurrency's per-call limit. Returns a function that runs `fn`
 * once a slot is free.
 */
export function createLimiter(max: number) {
    let active = 0
    const queue: Array<() => void> = []
    // A finishing call hands its slot straight to the next queued one, so a
    // newcomer can't slip in between and exceed `max`.
    const release = () => {
        const next = queue.shift()
        if (next) next()
        else active--
    }
    return async function run<T>(fn: () => Promise<T>): Promise<T> {
        if (active >= max) await new Promise<void>((resolve) => queue.push(resolve))
        else active++
        try {
            return await fn()
        } finally {
            release()
        }
    }
}

/**
 * For bulk background lookups (per-company/per-agent metrics). Together they
 * never take more than half the browser's ~6 connections per host, so the
 * data the user is actually waiting on is never queued behind them.
 */
export const backgroundRequest = createLimiter(3)
