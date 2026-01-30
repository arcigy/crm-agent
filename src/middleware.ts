import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/login",
  "/",
  "/api/(.*)",
  "/oauth-callback",
  "/mobile-setup",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip public routes
  if (isPublicRoute(req)) return;

  // Protect dashboard routes
  if (isProtectedRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/login", req.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
