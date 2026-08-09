"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="w-full max-w-md rounded-2xl border border-(--border) bg-(--surface) p-8 shadow-lg">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-(--primary)">
            <span className="text-xl font-bold text-white">S</span>
          </div>

          <h1 className="text-2xl font-bold text-(--foreground)">
            School Management System
          </h1>

          <p className="mt-2 text-sm text-(--muted)">
            Sign in to access the administration portal.
          </p>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");

            const result = await signIn("credentials", {
              email,
              password,
              redirect: false,
            });

            if (result?.error) {
              setError("Invalid email or password.");
              return;
            }

            window.location.href = "/dashboard";
          }}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@school.com"
              required
              className="w-full rounded-lg border border-(--border) bg-white px-4 py-3 text-sm outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-[(--primary-light)"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-(--border) bg-white px-4 py-3 text-sm outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary-light)"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-(--accent-light) px-4 py-3 text-sm text-(--accent-dark)">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-(--primary-dark) px-4 py-3 text-sm font-semibold text-white transition hover:bg-(--primary) focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}