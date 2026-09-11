/**
 * Resolves the backend URL for both client (browser) and server contexts.
 * When deployed on Vercel or other cloud hosts, routes to Render backend.
 * In local development, routes to localhost:8000.
 */
export function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/['"]/g, "").trim();
    if (publicUrl && !publicUrl.includes("localhost") && !publicUrl.includes("127.0.0.1")) {
      return publicUrl;
    }
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      return "https://aiecommerce-backend.onrender.com";
    }
    return publicUrl || "http://localhost:8000";
  }

  const explicit = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (explicit && !explicit.includes("localhost") && !explicit.includes("127.0.0.1")) {
    return explicit.replace(/['"]/g, "").trim();
  }
  if (process.env.NODE_ENV === "production") {
    return "https://aiecommerce-backend.onrender.com";
  }
  return (explicit || "http://localhost:8000").replace(/['"]/g, "").trim();
}
