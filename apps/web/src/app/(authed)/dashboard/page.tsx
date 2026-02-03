"use client";

import { useEffect } from "react";

export default function DashboardPage() {
  useEffect(() => {
    fetch("/api/bff/me")
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        console.log("data", data);
      });
  }, []);

  return <div>Dashboard</div>;
}
