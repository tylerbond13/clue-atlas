import { getD1 } from "@/db";
import { stableHash } from "@/lib/server/utils";

export type RequestUser = {
  id: string;
  email: string;
  displayName: string;
  xpTotal: number;
  streakDays: number;
  lastStudyDate: string | null;
};

const LOCAL_EMAIL = "local.explorer@clue-atlas.dev";

export async function getOrCreateRequestUser(
  request: Request,
): Promise<RequestUser> {
  const identity = identityFromHeaders(request.headers);
  const db = getD1();
  const now = new Date().toISOString();
  const id = `usr_${stableHash(identity.email)}`;

  await db
    .prepare(
      `INSERT INTO users (
        id, email, display_name, xp_total, streak_days,
        last_study_date, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 0, NULL, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        display_name = excluded.display_name,
        updated_at = excluded.updated_at`,
    )
    .bind(id, identity.email, identity.displayName, now, now)
    .run();

  const row = await db
    .prepare(
      `SELECT id, email, display_name, xp_total, streak_days, last_study_date
       FROM users WHERE email = ?`,
    )
    .bind(identity.email)
    .first<{
      id: string;
      email: string;
      display_name: string;
      xp_total: number;
      streak_days: number;
      last_study_date: string | null;
    }>();

  if (!row) throw new Error("Unable to create the current user.");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    xpTotal: Number(row.xp_total),
    streakDays: Number(row.streak_days),
    lastStudyDate: row.last_study_date,
  };
}

function identityFromHeaders(headers: Headers): {
  email: string;
  displayName: string;
} {
  const rawEmail = headers.get("oai-authenticated-user-email")?.trim();
  const email = rawEmail?.toLocaleLowerCase("en-US") || LOCAL_EMAIL;
  const encodedName = headers.get("oai-authenticated-user-full-name");
  const encoding = headers.get("oai-authenticated-user-full-name-encoding");
  const fullName =
    encodedName && encoding === "percent-encoded-utf-8"
      ? safeDecode(encodedName)
      : null;
  return {
    email,
    displayName:
      fullName?.trim() ||
      (email === LOCAL_EMAIL ? "Local Explorer" : email.split("@")[0]),
  };
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
