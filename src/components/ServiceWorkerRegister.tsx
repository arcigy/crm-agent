"use client";

import * as React from "react";

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    // ⚠️ EMERGENCY FIX: FORCE UNREGISTER ALL SERVICE WORKERS
    // This solves the "Infinite Loop" issue caused by stale caching in development mode
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister().then(() => {
            console.log("ServiceWorker unregistered to cleanup cache.");
          });
        }
      });
      
      // Clear caches just in case
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    }
  }, []);

  return null;
}
