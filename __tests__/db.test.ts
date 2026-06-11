import { describe, it, expect, vi } from 'vitest'

// Test getServiceClient throws when service role key is missing.
// This is a critical guard added in D4.

describe('getServiceClient', () => {
  it('throws when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    // Mock createClient so the module loads without real credentials
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue({}),
    }))

    const { getServiceClient } = await import('@/lib/db')
    expect(() => getServiceClient()).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY')
  })

  it('returns a client when service role key is set', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-123')

    const mockClient = { from: vi.fn() }
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue(mockClient),
    }))

    const { getServiceClient } = await import('@/lib/db')
    const client = getServiceClient()
    expect(client).toBe(mockClient)
  })
})

describe('getUserSession first-open fallback', () => {
  it('returns null when the DB has no session row', async () => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
    }))

    const { getUserSession } = await import('@/lib/db')
    const result = await getUserSession('user-123')
    expect(result).toBeNull()
  })
})
