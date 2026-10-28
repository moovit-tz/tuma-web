"use client"

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { AuthProvider } from "./AuthProvider"
import { PermissionsProvider } from "@/hooks/use-permissions"

const isUnauthorized = (error: any) => error?.response?.status === 401 || error?.status === 401

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                // Query-level onError was removed in React Query v5 — it silently
                // never fired here, so the 401 → logout redirect only ever worked
                // for mutations. QueryCache.onError is the v5-correct place for it.
                queryCache: new QueryCache({
                    onError: (error) => {
                        if (isUnauthorized(error)) {
                            window.dispatchEvent(new CustomEvent("auth:unauthorized"))
                        }
                    },
                }),
                defaultOptions: {
                    queries: {
                        retry: false,
                        refetchOnWindowFocus: false,
                        // Default caching behavior - individual queries can still
                        // opt into a shorter staleTime where genuine near-real-time
                        // freshness matters. At 15s/15s every remount (e.g. navigating
                        // back to a page) was a guaranteed network refetch — nothing
                        // was ever actually served from cache. 1 minute fresh / 5
                        // minutes kept around is a normal default for admin data.
                        staleTime: 60 * 1000, // 1 minute
                        gcTime: 5 * 60 * 1000, // 5 minutes
                    },
                    mutations: {
                        onError: (error: any) => {
                            if (isUnauthorized(error)) {
                                window.dispatchEvent(new CustomEvent("auth:unauthorized"))
                            }
                        },
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <PermissionsProvider>{children}</PermissionsProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}
