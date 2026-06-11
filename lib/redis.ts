import { Redis } from '@upstash/redis'

// Lazily initialize so the module doesn't crash during build if env vars are missing
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars')
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

export const TTL = {
  LIVE:     30,        // 30 seconds — live game scores
  UPCOMING: 5 * 60,   // 5 minutes  — upcoming/scheduled games
  FINISHED: 60 * 60,  // 1 hour     — completed games
  NEWS:     10 * 60,  // 10 minutes — news feed
  TEAMS:    24 * 60 * 60, // 24 hours — team lists rarely change
  STANDINGS: 15 * 60, // 15 minutes — standings
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis()
    const val = await redis.get<T>(key)
    return val ?? null
  } catch (err) {
    console.error('[Redis] cacheGet error:', err)
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedis()
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (err) {
    console.error('[Redis] cacheSet error:', err)
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis()
    await redis.del(key)
  } catch (err) {
    console.error('[Redis] cacheDel error:', err)
  }
}

/**
 * Generic cache-aside helper.
 * @example
 * const scores = await withCache('scores:nba', TTL.LIVE, () => getScores('nba'))
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const fresh = await fetcher()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}
