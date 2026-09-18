import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left side - Branding (Hidden on smaller screens) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 lg:flex">
        {/* Abstract Background Elements */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl"></div>
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-3xl"></div>
        
        <div className="relative z-10 flex h-full flex-col p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M2 12h10" />
                <path d="M9 4v16" />
                <path d="m3 9 3 3-3 3" />
                <path d="M14 4h7v16h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Vision One
            </h1>
          </div>

          <div className="mt-auto">
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Enterprise Resource <br />
              <span className="text-indigo-400">Planning Platform</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg text-slate-300">
              Streamline your operations, manage resources efficiently, and make
              data-driven decisions with our comprehensive suite of tools designed
              for modern businesses.
            </p>
            

          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="relative flex w-full flex-col px-6 sm:px-8 py-4 md:justify-center md:py-12 lg:w-1/2 lg:px-8 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md flex-1 md:flex-none flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="mb-4 md:mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M2 12h10" />
                <path d="M9 4v16" />
                <path d="m3 9 3 3-3 3" />
                <path d="M14 4h7v16h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Vision One
            </h1>
          </div>

          <Suspense fallback={
            <div className="flex w-full items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <div className="mt-4 pb-2 lg:absolute lg:bottom-6 lg:left-0 lg:mt-0 lg:pb-0 w-full px-4 text-center text-[10px] md:text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Vision One Fab Pvt Ltd. Developed by{" "}
          <a
            href="https://nafter.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline font-medium"
          >
            Nafter.in
          </a>
        </div>
      </div>
    </div>
  );
}
