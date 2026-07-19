import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("defines the complete Clue Atlas product shell", async () => {
  const [page, layout, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ClueAtlasApp.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Clue Atlas — Personal Knowledge Gym/i);
  assert.match(page, /<ClueAtlasApp \/>/);
  assert.match(layout, /Know more\. Know what to learn next\./);
  assert.match(layout, /og\.png/);
  assert.match(client, /Today’s Circuit/);
  assert.match(client, /Knowledge pulse/);
  assert.match(client, /Signal card/);
  assert.match(client, /Data Lab/);
  assert.match(client, /<main\b/i);
  assert.match(client, /aria-label="Primary"/i);
  assert.doesNotMatch(`${page}\n${layout}\n${client}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships persistence, learning APIs, and GitHub-ready documentation", async () => {
  const [hosting, packageJson, page, layout, readme, schema, attemptRoute] =
    await Promise.all([
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../README.md", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/attempt/route.ts", import.meta.url), "utf8"),
    ]);

  assert.match(hosting, /"d1"\s*:\s*"DB"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|codex-preview/);
  assert.match(layout, /Clue Atlas/);
  assert.match(readme, /Clue Atlas/);
  assert.match(schema, /attempts/);
  assert.match(schema, /cardSchedulerState|card_scheduler_state/);
  assert.match(attemptRoute, /clientAttemptId/);
  assert.match(attemptRoute, /confidence/);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await access(new URL("../docs/DATA_MODEL.md", import.meta.url));
  await access(new URL("../docs/ANALYTICS.md", import.meta.url));
});

test("the client exposes all six learning surfaces", async () => {
  const client = await readFile(new URL("../app/ClueAtlasApp.tsx", import.meta.url), "utf8");
  for (const surface of ["Today", "Learn", "Play", "Knowledge Map", "Studio", "Data Lab"]) {
    assert.match(client, new RegExp(surface.replace(" ", "\\s"), "i"));
  }
  assert.match(client, /Placement Sprint/);
  assert.match(client, /Board Rush/);
  assert.match(client, /Gap Sprint/);
  assert.match(client, /api\/export\/attempts\.csv/);
});

void projectRoot;
