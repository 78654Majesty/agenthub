"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { clearAdminSession, fetchAdminSession, getAdminToken } from "@/lib/api/admin";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkAdminSession() {
      if (!getAdminToken()) {
        router.replace("/admin/login");
        return;
      }

      try {
        await fetchAdminSession();
        if (cancelled) {
          return;
        }
        router.replace("/admin/dashboard");
      } catch {
        if (cancelled) {
          return;
        }
        clearAdminSession();
        router.replace("/admin/login");
      }
    }

    void checkAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
