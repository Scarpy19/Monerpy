
import { defineMiddleware, sequence } from 'astro:middleware';
import { validateSession, destroySession } from '@lib/session-manager.ts';
import { validateFingerprint } from '@lib/fingerprint.ts';
import { csrfMiddleware } from './csrf.ts';

const authMiddleware = defineMiddleware(async (context, next) => {
    const { request, url, cookies, locals, redirect } = context;

    // Ignore Chrome DevTools requests and return 404
    if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
        return new Response('Not Found', { status: 404 });
    } else {
        console.log(`[MIDDLEWARE] Processing request: ${url.pathname}`);
    }


    // Log action requests for debugging
    if (url.pathname.startsWith('/_actions/')) {
        console.log(`[MIDDLEWARE] Action request: ${url.pathname}`);
    }

    // Get session ID from cookie
    const sessionId = cookies.get('astro-auth')?.value;

    // Try to validate session if cookie exists
    if (sessionId) {
        const session = validateSession(sessionId);

        if (session) {
            // Validate fingerprint for security
            const fingerprintValid = validateFingerprint(request, session.fingerprint);

            if (!fingerprintValid) {
                console.log(`[MIDDLEWARE] Invalid fingerprint for session ${sessionId}, destroying session`);
                destroySession(sessionId);
                cookies.delete('astro-auth', { path: '/' });
                // Don't set user in locals, treat as unauthenticated
            } else {
                // Set user in locals for use in pages
                locals.user = {
                    id: session.userId,
                    username: session.username,
                    email: session.email,
                    created: session.created
                };
            }
        }
    }

    // Define public paths that don't require authentication
    const publicPaths = ['/', '/login', '/newaccount', '/health'];
    const isPublicPath = publicPaths.includes(url.pathname);
    const isActionEndpoint = url.pathname.startsWith('/_actions/');

    // Check if user is on login page with redirectTo parameter and is already logged in
    // If user is logged in and trying to access login page, redirect to dashboard
    // But skip this for action endpoints to avoid interfering with login/logout actions
    if (locals.user && url.pathname === '/login' && !isActionEndpoint) {
        const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
        console.log(`[MIDDLEWARE] Redirecting authenticated user from login to ${redirectTo}`);
        return redirect(redirectTo, 302);
    }

    // If user is not logged in and trying to access a protected page, redirect to login
    // But only if the route actually exists - let non-existent routes fall through to 404
    if (!locals.user && !isPublicPath && !isActionEndpoint) {
        // First, let Astro process the request to see if the route exists
        const response = await next();

        // If the response is 404, the route doesn't exist, so return the 404
        if (response.status === 404) {
            console.log(`[MIDDLEWARE] Route ${url.pathname} does not exist, returning 404`);
            return response;
        }

        // If we get here, the route exists but user is not authenticated
        console.log(`[MIDDLEWARE] Redirecting unauthenticated user from ${url.pathname} to login`);
        const loginUrl = new URL('/login', url.origin);
        loginUrl.searchParams.set('redirectTo', url.pathname + url.search);
        return redirect(loginUrl.toString(), 302);
    }

    // For all other cases, process the request normally
    const response = await next();
    return response;
});

// Combine middlewares
export const onRequest = sequence(authMiddleware, csrfMiddleware);