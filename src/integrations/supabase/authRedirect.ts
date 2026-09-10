const configuredAuthRedirect = import.meta.env["VITE_AUTH_REDIRECT_URL"]?.trim();

export function getAuthRedirectUrl(): string {
    if (typeof window !== "undefined") return window.location.origin;
    if (configuredAuthRedirect) return configuredAuthRedirect;

    throw new Error("Auth redirect URL is unavailable outside the browser.");
}
