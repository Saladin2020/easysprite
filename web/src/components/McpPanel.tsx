import { useCallback, useEffect, useState } from "react";
import {
  fetchMcpStatus,
  startMcpHttp,
  stopMcpHttp,
  type McpStatus,
} from "../api";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function McpPanel() {
  const [mcp, setMcp] = useState<McpStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMcpStatus();
      setMcp(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP status");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const onCopy = async (key: string, value: string) => {
    const ok = await copyText(value);
    setCopied(ok ? key : "");
    if (ok) window.setTimeout(() => setCopied(""), 1600);
  };

  const onStartHttp = async () => {
    setBusy(true);
    try {
      setMcp(await startMcpHttp());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
    } finally {
      setBusy(false);
    }
  };

  const onStopHttp = async () => {
    setBusy(true);
    try {
      setMcp(await stopMcpHttp());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setBusy(false);
    }
  };

  const httpOnline = Boolean(mcp?.http.online);
  const cursorJson = mcp ? JSON.stringify(mcp.stdio.cursorConfig, null, 2) : "";

  return (
    <section className={`panel mcp-panel${open ? "" : " collapsed"}`}>
      <div className="mcp-head">
        <div>
          <h2>
            <span className="step step-leaf">AI</span>MCP
          </h2>
          <p className="mcp-sub">
            AI agents compose &amp; export via tools — no in-app art generation.
          </p>
        </div>
        <div className="mcp-head-actions">
          <span className={`mcp-pill ${httpOnline ? "on" : "off"}`}>
            HTTP {httpOnline ? "online" : "offline"}
          </span>
          <span className="mcp-pill stdio">stdio · Cursor</span>
          <button type="button" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <>
          {error && <p className="status err">{error}</p>}
          {!mcp && !error && <p className="status">Loading MCP status…</p>}

          {mcp && (
            <div className="mcp-grid">
              <div className="mcp-card">
                <h3>Cursor (User MCP · ในและนอกโปรเจกต์)</h3>
                <p className="mcp-muted">{mcp.stdio.for}</p>
                <p>
                  Put this under <code>mcpServers</code> in{" "}
                  <code>{mcp.stdio.cursorConfigPath}</code> — badge should say{" "}
                  <strong>User</strong>.
                </p>
                <p>
                  Launcher: <code>~/.cursor/easysprite-mcp.mjs</code>
                  {" · "}
                  <code>{mcp.stdio.homeEnv}</code>
                  {" = "}
                  <code>{mcp.stdio.homeEnvValue}</code>
                </p>
                <p>
                  Or run: <code>{mcp.stdio.command}</code>
                </p>
                <div className="mcp-actions">
                  <button
                    type="button"
                    onClick={() => void onCopy("cursor", cursorJson)}
                  >
                    {copied === "cursor" ? "Copied" : "Copy User mcp entry"}
                  </button>
                </div>
                <pre className="mcp-code">{cursorJson}</pre>
              </div>

              <div className="mcp-card">
                <h3>HTTP (Grok / remote)</h3>
                <p className="mcp-muted">{mcp.http.for}</p>
                <p>
                  Endpoint: <code>{mcp.http.url}</code>
                </p>
                <p>
                  CLI: <code>{mcp.http.command}</code>
                </p>
                <div className="mcp-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || httpOnline}
                    onClick={() => void onStartHttp()}
                  >
                    {busy ? "…" : "Start HTTP MCP"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || (!httpOnline && !mcp.http.managed.running)}
                    onClick={() => void onStopHttp()}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => void onCopy("url", mcp.http.url)}
                  >
                    {copied === "url" ? "Copied" : "Copy URL"}
                  </button>
                </div>
                <p className="mcp-muted">
                  {httpOnline
                    ? `Listening on ${mcp.http.host}:${mcp.http.port}`
                    : "Start here or run npm run mcp:http in a terminal."}
                  {mcp.http.managed.pid ? ` · pid ${mcp.http.managed.pid}` : ""}
                </p>
              </div>

              <div className="mcp-card mcp-tools">
                <h3>Tools ({mcp.tools.length})</h3>
                <ol className="mcp-flow">
                  {mcp.flow.map((step) => (
                    <li key={step}>
                      <code>{step}</code>
                    </li>
                  ))}
                </ol>
                <ul className="mcp-tool-list">
                  {mcp.tools.map((tool) => (
                    <li key={tool.name}>
                      <strong>{tool.name}</strong>
                      <span>{tool.description}</span>
                    </li>
                  ))}
                </ul>
                {mcp.prompts.map((p) => (
                  <div key={p.name} className="mcp-prompt">
                    <div className="mcp-prompt-head">
                      <h4>
                        Prompt · <code>{p.name}</code>
                      </h4>
                      {p.body ? (
                        <button
                          type="button"
                          onClick={() => void onCopy(`prompt:${p.name}`, p.body!)}
                        >
                          {copied === `prompt:${p.name}` ? "Copied" : "Copy"}
                        </button>
                      ) : null}
                    </div>
                    <p className="mcp-muted">{p.description}</p>
                    {p.body ? <pre className="mcp-code mcp-prompt-body">{p.body}</pre> : null}
                  </div>
                ))}
                <p className="mcp-muted mcp-note">{mcp.note}</p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
