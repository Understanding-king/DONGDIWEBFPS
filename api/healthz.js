export default function healthz(_request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(200).json({ ok: true, service: 'web-fps-vercel' });
}
