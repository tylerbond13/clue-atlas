import { isSchedulerRating } from "@/lib/scheduler";
import { getOrCreateRequestUser } from "@/lib/server/auth";
import { recordAttempt } from "@/lib/server/attempts";
import { ensureDatabase } from "@/lib/server/initialize";
import type {
  AttemptMode,
  AttemptRequest,
  Confidence,
} from "@/lib/server/types";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
  requiredString,
} from "@/lib/server/utils";

export const dynamic = "force-dynamic";

const CONFIDENCE = new Set<Confidence>(["low", "medium", "high"]);
const MODES = new Set<AttemptMode>(["diagnostic", "review", "play"]);

export async function POST(request: Request): Promise<Response> {
  try {
    await ensureDatabase();
    const body = await readJsonObject(request);
    const user = await getOrCreateRequestUser(request);
    const answer = body.answer;
    if (typeof answer !== "string" || answer.length > 500) {
      throw new HttpError(400, "answer must be a string of 500 characters or fewer.");
    }
    if (body.rating !== undefined && !isSchedulerRating(body.rating)) {
      throw new HttpError(400, "rating must be again, hard, good, or easy.");
    }
    if (
      body.confidence !== undefined &&
      !CONFIDENCE.has(body.confidence as Confidence)
    ) {
      throw new HttpError(400, "confidence must be low, medium, or high.");
    }
    if (body.hintUsed !== undefined && typeof body.hintUsed !== "boolean") {
      throw new HttpError(400, "hintUsed must be true or false.");
    }
    if (
      body.responseMs !== undefined &&
      (!Number.isInteger(body.responseMs) ||
        Number(body.responseMs) < 0 ||
        Number(body.responseMs) > 3_600_000)
    ) {
      throw new HttpError(400, "responseMs must be an integer from 0 to 3600000.");
    }
    if (body.mode !== undefined && !MODES.has(body.mode as AttemptMode)) {
      throw new HttpError(400, "mode must be diagnostic, review, or play.");
    }

    const input: AttemptRequest = {
      clientAttemptId: requiredString(
        body.clientAttemptId,
        "clientAttemptId",
        120,
      ),
      questionId: requiredString(body.questionId, "questionId", 160),
      answer,
      rating: body.rating as AttemptRequest["rating"],
      confidence: body.confidence as Confidence | undefined,
      hintUsed: body.hintUsed as boolean | undefined,
      responseMs: body.responseMs as number | undefined,
      mode: body.mode as AttemptMode | undefined,
    };
    const saved = await recordAttempt(user, input);
    return jsonResponse({ ok: true, ...saved });
  } catch (error) {
    return errorResponse(error);
  }
}
