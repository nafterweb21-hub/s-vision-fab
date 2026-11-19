import Sidebar from "@/components/Sidebar";
import { auth } from "@/lib/auth";
import { Bell, UserCircle } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import AuthProvider from "@/components/AuthProvider";
import PageTitle from "@/components/PageTitle";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* Sidebar navigation panel */}
      <Sidebar
        userEmail={session?.user?.email}
        userRole={session?.user?.role}
        userPermissions={session?.user?.permissions}
      />

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-4 pl-14 sm:px-6 md:pl-6">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <GlobalSearch />

            <button className="relative p-1.5 sm:p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-indigo-600 shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 shrink-0">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-700">{session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{session?.user?.role || 'Guest'}</p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Soft atmospheric radial gradients behind page content */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-200/20 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-200/20 blur-[100px] pointer-events-none z-0" />

        {/* Dynamic page contents scrollable. No z-index here on purpose: one would make <main> a
            stacking context and trap every page modal/toast (z-50) beneath the sidebar (z-40).
            Being positioned and later in the DOM already paints it above the z-0 gradients. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full px-3 pt-4 pb-12 sm:px-4 lg:px-6">
          <div className="mx-auto w-full max-w-[1920px] min-w-0">
            <PageTitle />
            <AuthProvider session={session}>{children}</AuthProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
