"use client";

import { useState } from "react";

type EmailPreviewProps = {
  html: string;
  text: string;
};

export function EmailPreview({ html, text }: EmailPreviewProps) {
  const [tab, setTab] = useState<"html" | "text">("html");

  return (
    <div className="email-preview">
      <div className="email-preview__tabs">
        <button
          type="button"
          className={tab === "html" ? "email-preview__tab is-active" : "email-preview__tab"}
          onClick={() => setTab("html")}
        >
          HTML
        </button>
        <button
          type="button"
          className={tab === "text" ? "email-preview__tab is-active" : "email-preview__tab"}
          onClick={() => setTab("text")}
        >
          Texto plano
        </button>
      </div>

      {tab === "html" ? (
        <iframe
          className="email-preview__iframe"
          srcDoc={html}
          title="Preview HTML del correo"
          sandbox="allow-same-origin"
        />
      ) : (
        <pre className="email-preview__text">{text}</pre>
      )}
    </div>
  );
}
