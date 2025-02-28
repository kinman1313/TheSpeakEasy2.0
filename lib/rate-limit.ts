export interface RateLimiterOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens per interval
}

export function rateLimit(options: RateLimiterOptions) {
  const tokenCache = new Map()
  let lastInterval = Date.now()

  return {
    check: (request: Request, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now()
        const intervalStart = now - (now % options.interval)

        if (intervalStart !== lastInterval) {
          tokenCache.clear()
          lastInterval = intervalStart
        }

        const clientId = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous"

        const tokenKey = `${clientId}-${token}`
        const tokenCount = (tokenCache.get(tokenKey) || 0) + 1

        if (tokenCount > limit) {
          return reject(new Error("Rate limit exceeded"))
        }

        tokenCache.set(tokenKey, tokenCount)

        if (tokenCache.size > options.uniqueTokenPerInterval) {
          reject(new Error("Rate limit exceeded"))
        }

        resolve()
      }),
  }
}

