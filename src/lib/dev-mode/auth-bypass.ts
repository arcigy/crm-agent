/**
 * @LOCAL_DEV_BYPASS - REMOVE BEFORE PROD
 * Centralized logic for bypassing Clerk authentication on localhost.
 */

export const DEV_ADMIN_EMAIL = "arcigyback@gmail.com";

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
  return {
    id: "dev_user_999",
    primaryEmailAddress: {
      emailAddress: DEV_ADMIN_EMAIL
    },
    firstName: "Dev",
    lastName: "Admin",
    role: "admin"
  };
}
