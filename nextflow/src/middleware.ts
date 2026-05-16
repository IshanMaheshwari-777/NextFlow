import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    try {
      await auth.protect();
    } catch (error) {
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
