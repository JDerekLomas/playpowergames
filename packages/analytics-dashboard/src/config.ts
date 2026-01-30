export const API_URL = "https://ybsik3qgzl.execute-api.us-east-1.amazonaws.com/dev/"
export const QUERY_API_URL = `${API_URL}query?type=sessionData&limit=50&sort=asc`

export const getQueryAPI = (
    type: string,
    limit: number = 50,
    sort: string = "asc",
    nextToken?: string | null,
    filters?: Record<string, string | number | undefined>
) => {
    const params = new URLSearchParams({ type, limit: String(limit), sort })
    if (nextToken) params.set('nextToken', String(nextToken))
    if (filters) {
        for (const [k, v] of Object.entries(filters)) {
            if (v !== undefined && v !== null && String(v).length > 0) {
                params.set(k, String(v))
            }
        }
    }
    return `${API_URL}query?${params.toString()}`
}