import { cookies } from "next/headers";

const DEFAULT_BASE_URL = "http://localhost:8080";

function resolveGatewayBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "").trim();

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  try {
    return new URL(configured).toString();
  } catch {
    try {
      return new URL(`http://${configured}`).toString();
    } catch {
      return DEFAULT_BASE_URL;
    }
  }
}

function buildGatewayExportUrl(searchParams: URLSearchParams) {
  const url = new URL("/v1/user/orders", resolveGatewayBaseUrl());

  for (const [key, value] of searchParams.entries()) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  url.searchParams.set("format", "csv");
  return url;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("agenthub_token")?.value;

  if (!token) {
    return new Response("Missing wallet token", { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const gatewayUrl = buildGatewayExportUrl(requestUrl.searchParams);
  const response = await fetch(gatewayUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = await response.text();

  if (!response.ok) {
    return new Response(body || "Export failed", { status: response.status });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ?? 'attachment; filename="agenthub-orders.csv"',
    },
  });
}
