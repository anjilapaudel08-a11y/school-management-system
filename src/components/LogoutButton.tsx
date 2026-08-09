"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg px-3 py-2 text-sm hover:bg-white/10"
    >
      Sign out
    </button>
  );
}