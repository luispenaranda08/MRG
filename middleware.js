// En mirage.hypertarget.tech la raíz sirve la app Mirage (en hypertarget.tech sigue la landing).
export const config = { matcher: ["/", "/index", "/index.html"] };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname === "mirage.hypertarget.tech") {
    return new Response(null, { headers: { "x-middleware-rewrite": new URL("/mirage", url).toString() } });
  }
  return new Response(null, { headers: { "x-middleware-next": "1" } });
}
