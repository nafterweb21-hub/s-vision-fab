import Sidebar from "@/components/Sidebar";
import { auth } from "@/lib/auth";
import { Bell, Search, UserCircle } from "lucide-react";
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

      {/* Top Header */}
      <header className="fixed top-0 right-0 left-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm z-30 flex items-center justify-between px-4 sm:px-8 transition-all duration-300">
        <div className="ml-[3rem] sm:ml-20 flex items-center gap-2 sm:gap-3 shrink-0">
           {/* Space for the Sidebar toggle button */}
           <img src="/logo.jpg" alt="Vision One Logo" className="h-6 sm:h-8 w-auto object-contain drop-shadow-sm" />
           <div className="hidden sm:block">
             <h1 className="font-extrabold text-sm text-slate-900 tracking-wide leading-tight">
               FITPRISE EMS
             </h1>
             <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase leading-none mt-0.5">
               Vision One ERP
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6 shrink-0">
          <GlobalSearch />
          
          <button className="relative p-1.5 sm:p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-indigo-600 shrink-0">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-slate-700">{session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{session?.user?.role || 'Guest'}</p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Soft atmospheric radial gradients behind page content */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-indigo-200/20 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-200/20 blur-[100px] pointer-events-none z-0" />

        {/* Dynamic page contents scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 w-full px-6 pt-16 pb-12 sm:px-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <PageTitle />
            <AuthProvider session={session}>{children}</AuthProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
