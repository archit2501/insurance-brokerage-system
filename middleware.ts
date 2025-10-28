import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
 
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	
	// Public routes that don't require authentication
	const publicRoutes = ['/login', '/register', '/api/auth'];
	const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
	
	if (isPublicRoute) {
		return NextResponse.next();
	}
	
	// Protected routes - require authentication
	const protectedPages = ['/clients', '/banks', '/insurers', '/agents', '/lobs', '/users', '/rfqs', '/policies', '/notes', '/reminders', '/dispatch', '/audit'];
	const isProtectedPage = protectedPages.some(route => pathname.startsWith(route));
	
	if (isProtectedPage) {
		// Check if user has a session
		try {
			const session = await auth.api.getSession({
				headers: request.headers
			});

			if (!session || !session.user) {
				// Redirect to login
				const loginUrl = new URL('/login', request.url);
				loginUrl.searchParams.set('redirect', pathname);
				return NextResponse.redirect(loginUrl);
			}
		} catch (error) {
			// Redirect to login on error
			const loginUrl = new URL('/login', request.url);
			loginUrl.searchParams.set('redirect', pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	// For API routes, add user email to request headers
	// (will be looked up in DB to get integer user ID)
	if (pathname.startsWith('/api/')) {
		try {
			const session = await auth.api.getSession({
				headers: request.headers
			});

			console.log('MIDDLEWARE DEBUG - pathname:', pathname);
			console.log('MIDDLEWARE DEBUG - session:', session ? 'exists' : 'null');
			console.log('MIDDLEWARE DEBUG - session.user:', session?.user ? 'exists' : 'null');
			console.log('MIDDLEWARE DEBUG - session.user.email:', session?.user?.email || 'null');
			console.log('MIDDLEWARE DEBUG - session.user.id:', session?.user?.id || 'null');

			if (session && session.user) {
				// Clone the request headers and add user info
				const requestHeaders = new Headers(request.headers);

				// Pass user email so API routes can look up the integer ID
				if (session.user.email) {
					requestHeaders.set('x-user-email', session.user.email);
					console.log('MIDDLEWARE DEBUG - Set x-user-email:', session.user.email);
				}

				// Also pass the auth UUID for backward compatibility
				if (session.user.id) {
					requestHeaders.set('x-user-id', session.user.id);
					console.log('MIDDLEWARE DEBUG - Set x-user-id:', session.user.id);
				}

				// Create a new request with the updated headers
				const response = NextResponse.next({
					request: {
						headers: requestHeaders,
					},
				});
				return response;
			}
		} catch (error) {
			console.error('Error getting session for API route:', error);
		}
	}

	return NextResponse.next();
}
 
export const config = {
  runtime: "nodejs",
  matcher: [
	  "/clients/:path*",
	  "/banks/:path*",
	  "/insurers/:path*",
	  "/agents/:path*",
	  "/lobs/:path*",
	  "/users/:path*",
	  "/rfqs/:path*",
	  "/policies/:path*",
	  "/notes/:path*",
	  "/reminders/:path*",
	  "/dispatch/:path*",
	  "/audit/:path*",
	  "/api/:path*"
  ],
};