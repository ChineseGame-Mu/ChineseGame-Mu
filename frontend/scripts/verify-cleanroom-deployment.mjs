const target = process.env.CLEANROOM_DEPLOYMENT_URL;
const retries = Number(process.env.CLEANROOM_DEPLOYMENT_RETRIES ?? 24);
const delayMs = Number(process.env.CLEANROOM_DEPLOYMENT_DELAY_MS ?? 10000);

if (!target) throw new Error("CLEANROOM_DEPLOYMENT_URL is required");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = async (url) => {
  const response = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return await response.text();
};

const inspect = async () => {
  const base = new URL(target);
  const html = await fetchText(base);
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (!scripts.length) throw new Error("no JavaScript bundles found in deployed HTML");

  const bundleTexts = [];
  for (const src of scripts) {
    const url = new URL(src, base);
    if (url.hostname !== base.hostname) continue;
    bundleTexts.push(await fetchText(url));
  }
  const joined = bundleTexts.join("\n");

  // Use runtime literals from the current final-art lobby implementation.
  const requiredMarkers = [
    "ENTER ROOM",
    "cleanroom-final-shell",
    "cleanroomRoom",
    "card-games-yihua.onrender.com/api/guandan",
    ".vercel.app",
    "cr-",
  ];
  const missing = requiredMarkers.filter((marker) => !joined.includes(marker));
  if (missing.length) {
    throw new Error(`deployed bundle is not the current cleanroom frontend; missing runtime markers: ${missing.join(", ")}`);
  }

  const mainBundle = scripts.find((src) => /main\.[a-f0-9]+\.js/.test(src)) ?? scripts.at(-1);
  return {
    target: base.toString(),
    mainBundle,
    requiredMarkers,
  };
};

let lastError;
for (let attempt = 1; attempt <= retries; attempt += 1) {
  try {
    const result = await inspect();
    console.log(JSON.stringify({ type: "cleanroom_deployment_frontend_qa_pass", attempt, ...result }));
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`CLEANROOM DEPLOYMENT QA attempt ${attempt}/${retries} failed: ${String(error)}`);
    if (attempt < retries) await sleep(delayMs);
  }
}
throw lastError;
