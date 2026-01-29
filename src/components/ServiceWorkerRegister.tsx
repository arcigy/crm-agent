"use client";

import * as React from "react";

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        function (registration) {
          console.log("ServiceWorker registration successful");
        },
        function (err) {
          console.log("ServiceWorker registration failed: ", err);
        },
      );
    }
  }, []);
  return null;
}
