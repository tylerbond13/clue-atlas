export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value), { ...init, headers });
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Expected an application/json request body.");
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Expected a JSON object.");
  }
  return value as Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return jsonResponse({ ok: false, error: error.message }, { status: error.status });
  }
  console.error(error);
  return jsonResponse(
    { ok: false, error: "Something went wrong while updating Clue Atlas." },
    { status: 500 },
  );
}

export function requiredString(
  value: unknown,
  label: string,
  maximumLength: number,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `${label} is required.`);
  }
  const result = value.trim();
  if (result.length > maximumLength) {
    throw new HttpError(
      400,
      `${label} must be ${maximumLength} characters or fewer.`,
    );
  }
  return result;
}

export function optionalString(
  value: unknown,
  label: string,
  maximumLength: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, label, maximumLength);
}

/** Normalize trivia answers without making broad fuzzy-match guesses. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/^(?:what|who|where)\s+(?:is|are|was|were)\s+/, "")
    .replace(/^(?:a|an|the)\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

/** Non-cryptographic stable hash used only for deterministic local IDs. */
export function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function isoDateInTimeZone(date: Date, timeZone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addUtcDays(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function utcDayBoundsInTimeZone(
  date: Date,
  timeZone = "America/New_York",
): { start: string; end: string } {
  const localDate = isoDateInTimeZone(date, timeZone);
  const nextLocalDate = addUtcDays(localDate, 1);
  return {
    start: zonedMidnight(localDate, timeZone).toISOString(),
    end: zonedMidnight(nextLocalDate, timeZone).toISOString(),
  };
}

function zonedMidnight(localDate: string, timeZone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day);
  let candidate = desiredUtc;
  // Two passes handle the rare case where the first UTC guess and the target
  // local midnight sit on opposite sides of a daylight-saving transition.
  for (let pass = 0; pass < 2; pass += 1) {
    candidate = desiredUtc - timeZoneOffsetMs(new Date(candidate), timeZone);
  }
  return new Date(candidate);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const numberPart = (
    type: "year" | "month" | "day" | "hour" | "minute" | "second",
  ) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const renderedAsUtc = Date.UTC(
    numberPart("year"),
    numberPart("month") - 1,
    numberPart("day"),
    numberPart("hour"),
    numberPart("minute"),
    numberPart("second"),
  );
  return renderedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function levelFromXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  // Each level gets gently wider: 100, 125, 150, ... XP.
  let level = 1;
  let remaining = Math.max(0, xp);
  let width = 100;
  while (remaining >= width && level < 100) {
    remaining -= width;
    level += 1;
    width = 100 + (level - 1) * 25;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: width };
}
