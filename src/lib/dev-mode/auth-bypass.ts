export let DEV_ADMIN_EMAIL = "branislav@arcigy.group";

export function isLocalhost() {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  return process.env.NODE_ENV === 'development';
}

export function shouldBypassAuth() {
  const forceBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
  return isLocalhost() || forceBypass;
}

export function getDevUser() {
  // Primary: Branislav for local development
  return {
    id: "user_39LUuptq4hAUjFIskaea5cMCbWb",
    primaryEmailAddress: {
      emailAddress: DEV_ADMIN_EMAIL
    },
    firstName: "Branislav",
    lastName: "ArciGy",
    imageUrl: "https://img.clerk.com/static/placeholder.png",
    publicMetadata: {
      role: "admin"
    }
  };
}
