import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

/**
 * 一次的なアクセス制御（Edge）。
 * - 署名付きセッションCookieのロールで /admin・/member・申請者ページを振り分ける
 * - Server Action 以外の POST（/api/*）は Origin / Sec-Fetch-Site を検証して CSRF を防ぐ
 * 最終的な権限判定は各ページ・Server Action・Route Handler でDBを参照して再度行う。
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- CSRF 対策（Stripe Webhook は署名検証で保護するので除外） ---
  if (pathname.startsWith("/api/") && req.method !== "GET" && req.method !== "HEAD") {
    if (pathname !== "/api/stripe/webhook" && !isSameOrigin(req)) {
      return new NextResponse("Forbidden (CSRF)", { status: 403 });
    }
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const loginRedirect = () => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!session) return loginRedirect();
    if (session.role !== "ADMIN") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/member")) {
    if (!session) return loginRedirect();
    if (session.role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
    if (session.role === "APPLICANT") {
      // 決済完了直後などで Cookie のロールが古い可能性があるため、DB から再発行して判定し直す
      const url = new URL("/api/session/refresh", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/apply/status") || pathname.startsWith("/apply/payment")) {
    if (!session) return loginRedirect();
    if (session.role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

function isSameOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return fetchSite === "same-origin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/member/:path*", "/apply/status/:path*", "/apply/payment/:path*", "/api/:path*"],
};
