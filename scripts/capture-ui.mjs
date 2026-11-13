/**
 * Headless Chrome CDP capture of the compositor UI (side-view demo).
 * Usage: node scripts/capture-ui.mjs [out.png]
 */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.resolve(process.argv[2] || "docs/assets/ui-compositor.png");
const PORT = 9333;
const URL = "http://127.0.0.1:5173/";

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1440,900",
    "--no-first-run",
    "--no-default-browser-check",
    URL,
  ],
  { stdio: "ignore" },
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error(`CDP not ready: ${url}`);
}

async function cdp(wsUrl, method, params = {}) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  let id = 0;
  const send = (m, p) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      const onMsg = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.id !== msgId) return;
        ws.removeEventListener("message", onMsg);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ id: msgId, method: m, params: p }));
    });
  try {
    return await send(method, params);
  } finally {
    ws.close();
  }
}

async function withSession(fn) {
  const targets = await waitJson(`http://127.0.0.1:${PORT}/json/list`);
  const page = targets.find((t) => t.type === "page" && t.url.includes("5173")) || targets[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  let id = 0;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      const onMsg = (ev) => {
        const data = JSON.parse(String(ev.data));
        if (data.id !== msgId) return;
        ws.removeEventListener("message", onMsg);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  try {
    return await fn(send);
  } finally {
    ws.close();
  }
}

try {
  await sleep(1500);
  await withSession(async (send) => {
    await send("Page.enable");
    await send("Runtime.enable");
    // Wait for workspace load
    for (let i = 0; i < 40; i++) {
      const { result } = await send("Runtime.evaluate", {
        expression: `document.querySelector('.view-switch') ? 'ok' : 'wait'`,
        returnByValue: true,
      });
      if (result.value === "ok") break;
      await sleep(250);
    }
    await send("Runtime.evaluate", {
      expression: `(() => {
        const click = (sel, text) => {
          const el = text
            ? [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text))
            : document.querySelector(sel);
          el && el.click();
        };
        click('.view-switch button', 'Side-view');
        const sel = document.getElementById('project-pick');
        if (sel) {
          const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
          set.call(sel, 'mcp_side_auntie_market');
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        click('button', 'Walk');
        click('button[aria-label="Side-scroller sky"], .swatch-sky');
        [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Hide').forEach((b) => b.click());
        const right = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'right');
        right && right.click();
        return true;
      })()`,
      returnByValue: true,
    });
    await sleep(1200);
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(OUT, Buffer.from(shot.data, "base64"));
  });
  console.log(`Wrote ${OUT}`);
} finally {
  chrome.kill();
}
