import TerminalClient from "./components/TerminalClient";
import { getTerminalSupportData, getTerminalActiveSessions, getTerminalRecentCompletes, getAvailableSessions } from "./actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const support = await getTerminalSupportData();
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth error in TerminalPage:", error);
  }
  
  let loggedInEmployee = null;
  let initialSessions: any[] = [];
  let initialRecentCompletes: any[] = [];
  
  if (session?.user) {
    if (session.user.employeeId) {
      // Look up by explicitly linked employeeId
      loggedInEmployee = await prisma.employee.findUnique({
        where: { id: session.user.employeeId },
        select: { id: true, name: true, code: true }
      });
    }

    // Auto-link by email if not linked yet
    if (!loggedInEmployee && session.user.email) {
      const match = await prisma.employee.findFirst({
        where: { email: session.user.email }
      });
      if (match) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { employeeId: match.id }
        });
        loggedInEmployee = { id: match.id, name: match.name, code: match.code };
      }
    }

    // Ultimate fallback to show the user's name
    if (!loggedInEmployee) {
      loggedInEmployee = {
        id: session.user.id,
        name: session.user.name || session.user.email || "Unknown",
        code: "UNLINKED_USER"
      };
    }
  }

  // Always fetch all sessions so the client can filter if localEmployee is used
  initialSessions = await getTerminalActiveSessions();
  // A worker sees their own recent completes; only an unlinked (e.g. admin) account sees everyone's.
  const scopeEmployeeId =
    loggedInEmployee && loggedInEmployee.code !== "UNLINKED_USER" ? loggedInEmployee.id : undefined;
  initialRecentCompletes = await getTerminalRecentCompletes(10, scopeEmployeeId);
  const completedTotal = await prisma.productionTimesheet.count({
    where: { timeOut: { not: null }, ...(scopeEmployeeId ? { employeeId: scopeEmployeeId } : {}) },
  });
  const initialAvailable = await getAvailableSessions();

  return (
    <TerminalClient 
      support={JSON.parse(JSON.stringify(support))} 
      loggedInEmployee={loggedInEmployee ? JSON.parse(JSON.stringify(loggedInEmployee)) : null}
      initialSessions={initialSessions}
      initialRecentCompletes={initialRecentCompletes}
      initialAvailable={initialAvailable}
      completedTotal={completedTotal}
    />
  );
}
