import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'

const isSignInPage = createRouteMatcher(['/welcome'])
const isProtectedRoute = createRouteMatcher(['/student(.*)', '/recruiter(.*)'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated()

  if (isSignInPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, '/')
  }
  if (isProtectedRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, '/welcome')
  }
})

export const config = {
  // Run on everything except static files and _next internals.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
