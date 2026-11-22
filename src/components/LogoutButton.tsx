"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg border border-[#e5d9cf] bg-white px-3 py-2 text-sm font-medium text-[#6b342d] transition hover:border-[#d5b9a7] hover:bg-[#f5e9df]"
    >
      Sign out
    </button>
  );
}