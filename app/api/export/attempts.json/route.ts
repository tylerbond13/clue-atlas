import { getOrCreateRequestUser } from "@/lib/server/auth";
import { getAttemptExportRows, jsonExport } from "@/lib/server/exports";
import { ensureDatabase } from "@/lib/server/initialize";
import { errorResponse, jsonResponse } from "@/lib/server/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await ensureDatabase();
    const user = await getOrCreateRequestUser(request);
    const rows = await getAttemptExportRows(user.id);
    const response = jsonResponse(jsonExport(user, rows));
    response.headers.set(
      "content-disposition",
      'attachment; filename="clue-atlas-attempts.json"',
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
