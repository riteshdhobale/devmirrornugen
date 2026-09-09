import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/github/return")({
  head: () => ({
    meta: [
      { title: "Connecting GitHub — DevMirror" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GitHubOAuthReturn,
});

function GitHubOAuthReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notifyOpenerAndClose = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "github", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "GitHub connection did not complete.");
      notifyOpenerAndClose("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notifyOpenerAndClose("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("OAuth completed without an exchange code.");
      notifyOpenerAndClose("appUserConnectorOAuthFailed");
      return;
    }
    notifyOpenerAndClose("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-mono text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
