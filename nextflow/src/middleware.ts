import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    try {
      await auth.protect();
    } catch (error) {
      // auth.protect() throws a Next.js redirect internally when unauthenticated —
      // rethrow that so Next can handle it, but for API routes return a clean 401
      // JSON response instead (a fetch() caller shouldn't have to follow a redirect
      // into an HTML sign-in page just to learn it's unauthorized).
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.error("[Middleware] Clerk Auth Error:", error);
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip _next/static, _next/image, and all files with extensions (images, fonts, etc.)
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
