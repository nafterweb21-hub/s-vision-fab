"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    
    if (!res || res.error) {
      setLoading(false);
      setError("Invalid email or password. Please try again.");
      return;
    }
    
    const session = await getSession();
    if (session?.user?.role === "PRODUCTION") {
      router.push("/terminal");
    } else if (session?.user?.role === "QC") {
      router.push("/qc");
    } else {
      router.push(res.url ?? callbackUrl);
    }
    
    router.refresh();
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-1 md:mt-6 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-xs md:text-sm text-gray-600">
          Please sign in to your account to continue.
        </p>
      </div>

      <form className="mt-6 md:mt-8 space-y-4 md:space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-3 md:space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="email" className="block text-xs md:text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2 md:px-4 md:py-3 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs md:text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2 md:px-4 md:py-3 pr-10 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs md:text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-xs md:text-sm">
            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-xl border border-transparent bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <>
                Sign in
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowRight className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
