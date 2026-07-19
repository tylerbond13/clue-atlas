import { getOrCreateRequestUser } from "@/lib/server/auth";
import {
  createCustomQuestion,
  type CustomQuestionInput,
} from "@/lib/server/custom-questions";
import { ensureDatabase } from "@/lib/server/initialize";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  optionalString,
  readJsonObject,
  requiredString,
} from "@/lib/server/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    await ensureDatabase();
    const body = await readJsonObject(request);
    const user = await getOrCreateRequestUser(request);
    const topicId = optionalString(body.topicId, "topicId", 160) ?? undefined;
    const topicSlug =
      optionalString(body.topicSlug, "topicSlug", 160) ?? undefined;
    if (!topicId && !topicSlug) {
      throw new HttpError(400, "topicId or topicSlug is required.");
    }
    const aliases = stringArray(body.aliases, "aliases", 20, 200);
    const pavlovCues = stringArray(body.pavlovCues, "pavlovCues", 20, 200);
    const rawDifficulty = body.difficulty ?? 2;
    if (
      !Number.isInteger(rawDifficulty) ||
      Number(rawDifficulty) < 1 ||
      Number(rawDifficulty) > 5
    ) {
      throw new HttpError(400, "difficulty must be an integer from 1 to 5.");
    }

    const input: CustomQuestionInput = {
      topicId,
      topicSlug,
      prompt: requiredString(body.prompt, "prompt", 1000),
      answer: requiredString(body.answer, "answer", 300),
      aliases,
      explanation:
        optionalString(body.explanation, "explanation", 2000) ??
        "A custom card added to your learning studio.",
      difficulty: Number(rawDifficulty),
      pavlovCues,
      source: parseSource(body.source),
    };
    const saved = await createCustomQuestion(user, input);
    return jsonResponse({ ok: true, ...saved }, { status: saved.created ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

function stringArray(
  value: unknown,
  label: string,
  maximumItems: number,
  maximumLength: number,
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new HttpError(
      400,
      `${label} must be an array with at most ${maximumItems} items.`,
    );
  }
  return value.map((item, index) =>
    requiredString(item, `${label}[${index}]`, maximumLength),
  );
}

function parseSource(value: unknown): CustomQuestionInput["source"] {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "source must be an object.");
  }
  const source = value as Record<string, unknown>;
  const url = optionalString(source.url, "source.url", 1000);
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new HttpError(400, "source.url must be a valid URL.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new HttpError(400, "source.url must use http or https.");
    }
  }
  return {
    title: requiredString(source.title, "source.title", 300),
    url,
    author: optionalString(source.author, "source.author", 200),
    license: optionalString(source.license, "source.license", 100),
  };
}
