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
	  "/audit/:path*"
  ],
};