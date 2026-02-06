"use client";

import { useEffect } from "react";
import { Button } from "@repo/ui";
import { ArrowRight } from "@repo/ui/icons";

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

  return (
    <div>
      Dashboard
      <Button icon={ArrowRight} iconAfter={ArrowRight}>
        Haha
      </Button>
    </div>
  );
}
