import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = 'wwms_admin';

async function isAdmin(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch { return false; }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin/** except /admin/login. We check the JWT inline here rather
  // than only at the layout level because middleware can short-circuit before
  // any RSC rendering happens.
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(COOKIE)?.value;
    const ok = await isAdmin(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // Forward the pathname as a REQUEST header so server components can read it
  // via headers() (used by the admin layout to differentiate the login page).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.png|images|.*\\..*).*)'],
};
