import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshing is required to update credentials for API calls and Server Components
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Define protected dashboard endpoints
  const protectedRoutes = [
    '/dashboard',
    '/internships',
    '/notes',
    '/placement',
    '/planner',
    '/projects',
    '/resume',
    '/settings'
  ]
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  // Skip redirect logic for Server Actions to avoid next.js 15 client router crash
  const isServerAction = request.headers.has('next-action')

  if (!isServerAction) {
    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Redirect authenticated user away from login/root to dashboard
    if (user && (path === '/login' || path === '/')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
