import { getOrCreateRequestUser } from "@/lib/server/auth";
import { buildBootstrap } from "@/lib/server/bootstrap";
import { ensureDatabase } from "@/lib/server/initialize";
import { errorResponse, jsonResponse } from "@/lib/server/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await ensureDatabase();
    const user = await getOrCreateRequestUser(request);
    return jsonResponse(await buildBootstrap(user));
  } catch (error) {
    return errorResponse(error);
  }
}
