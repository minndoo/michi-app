/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

export default function TestBFFPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [bffResponse, setBffResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check session on mount
    fetch("/api/bff/me")
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        setSessionInfo(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  const testBFF = async () => {
    setLoading(true);
    setError(null);
    setBffResponse(null);

    try {
      const response = await fetch("/api/bff/me");
      const data = await response.json();

      setBffResponse({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>BFF Test Page</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Session Info (from /api/auth/me)</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "1rem",
            borderRadius: "4px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>BFF Test (proxies to API /me endpoint)</h2>
        <button
          onClick={testBFF}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Testing..." : "Test BFF → /api/bff/me"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#fee",
              color: "#c00",
              borderRadius: "4px",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {bffResponse && (
          <div style={{ marginTop: "1rem" }}>
            <h3>
              Response: {bffResponse.status} {bffResponse.statusText}
            </h3>
            <pre
              style={{
                background: "#f5f5f5",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(bffResponse.data, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section>
        <h2>Instructions</h2>
        <ol>
          <li>
            Check the "Session Info" above - you should see your user data if
            logged in
          </li>
          <li>
            If not logged in, go to <a href="/auth/login">/auth/login</a> first
          </li>
          <li>Click "Test BFF" button to test the BFF proxy</li>
          <li>Check your terminal logs for detailed debugging info</li>
        </ol>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Quick Links</h2>
        <ul>
          <li>
            <a href="/auth/login">Login</a>
          </li>
          <li>
            <a href="/auth/logout">Logout</a>
          </li>
          <li>
            <a href="/api/auth/me">Direct Session Check</a>
          </li>
        </ul>
      </section>
    </div>
  );
}
