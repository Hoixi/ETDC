// /dashboard altını korur — giriş yoksa /login'e yönlendirir.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isDash = req.nextUrl.pathname.startsWith("/dashboard");
  if (isDash && !req.auth) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
