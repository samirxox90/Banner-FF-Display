const ALLOWED = ["SG","BD","IND","CIS","EU","NA","PK","ID","TH","MEA","BR","LATAM","VN","TW"];

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const url    = new URL(request.url);
  const region = url.searchParams.get("server") ?? "";

  if (!region) {
    return Response.json({ error: "Missing server query param" }, { status: 400 });
  }
  if (!ALLOWED.includes(region.toUpperCase())) {
    return Response.json({ error: "Invalid region" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://api-links1.vercel.app/api?server=${region.toUpperCase()}`,
      { headers: { "User-Agent": "ff-live-banners/1.0" } }
    );
    const data = await upstream.json();
    return Response.json(data, {
      status: upstream.status,
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return Response.json({ error: "Failed to reach upstream API" }, { status: 502 });
  }
}
