import { loadAvailability } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response("Bad date", { status: 400 });
  }
  try {
    const data = loadAvailability(date);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
