import { NextResponse } from "next/server";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Secret",
  "Access-Control-Max-Age": "86400"
};

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {})
    }
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function getAdminSecretFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length);
  return request.headers.get("x-admin-secret");
}

export function requireAdminSecret(request: Request) {
  const configuredSecret = process.env.ADMIN_SECRET;
  if (!configuredSecret) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          ok: false,
          error: "Admin publishing is not configured. Set ADMIN_SECRET on the public web deployment."
        },
        { status: 503 }
      )
    };
  }

  const providedSecret = getAdminSecretFromRequest(request);
  if (providedSecret !== configuredSecret) {
    return {
      ok: false as const,
      response: jsonResponse({ ok: false, error: "Invalid admin publishing key." }, { status: 401 })
    };
  }

  return { ok: true as const };
}
