import { getOrCreateRequestUser } from "@/lib/server/auth";
import { attemptsToCsv, getAttemptExportRows } from "@/lib/server/exports";
import { ensureDatabase } from "@/lib/server/initialize";
import { errorResponse } from "@/lib/server/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await ensureDatabase();
    const user = await getOrCreateRequestUser(request);
    const csv = attemptsToCsv(await getAttemptExportRows(user.id));
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition":
          'attachment; filename="clue-atlas-attempts.csv"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
