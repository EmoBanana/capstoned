import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Components under app/ use Next's client router; screens don't, but provide a
// safe mock so any route-aware component can be rendered in tests.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
