import { prisma } from "@/lib/prisma";
import WorkOrderList from "./components/WorkOrderList";
import { auth } from "@/lib/auth";
import { canCreate } from "@/lib/access";

/** Most work orders the list loads at once. */
const LIST_LIMIT = 500;

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage() {
  try {
    let workOrders: any[] = [];
    let errorMsg = null;

    const session = await auth();
    const userRole = session?.user?.role;

    const userEmployeeId = session?.user?.employeeId;
    
    const hasCreatePermission = canCreate(session?.user?.permissions, 'WORK_ORDER', userRole);

    // Bypass role filtering for management/admin roles so they can see all work orders
    const bypassRoles = ["Admin", "VIEWER", "Production Manager", "QC", "QC Manager"];
    const shouldFilterByRole = userRole && !bypassRoles.some((r) => r.toLowerCase() === userRole.toLowerCase());

    try {
      workOrders = await prisma.workOrder.findMany({
        where: {
          status: { notIn: ["Void", "Cancelled"] },
          ...(shouldFilterByRole ? {
            inProcesses: {
              some: {
                routingProcesses: {
                  some: {
                    routingProcess: {
                      allowedRoles: { some: { name: userRole } }
                    },
                    ...(userEmployeeId ? { assignedEmployeeId: userEmployeeId } : {})
                  }
                }
              }
            }
          } : {})
        },
        orderBy: { createdAt: "desc" },
        take: LIST_LIMIT, // Prevent OOM on large datasets
        include: {
          customer: true,
          inProcesses: {
            select: {
              routingProcesses: {
                select: {
                  sn: true,
                  status: true,
                  productionTimesheets: {
                    select: {
                      completedQty: true,
                      rejectedQty: true
                    }
                  }
                }
              }
            }
          }
        },
      });
    } catch (err: any) {
      console.error("Error fetching work orders:", err);
      errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : "Failed to load work orders from database.");
    }

    const enrichedWorkOrders = (workOrders || []).filter(Boolean).map((wo: any) => {
      let producedQty = 0;
      let rejectedQty = 0;
      const totalQty = Number(wo.quantity) || 0;

      if (wo.inProcesses && wo.inProcesses.length > 0) {
        let lastProcess = null;
        let maxSn = -1;
        wo.inProcesses.forEach((ip: any) => {
          ip.routingProcesses?.forEach((rp: any) => {
            const numericSn = parseInt(rp?.sn, 10);
            if (!isNaN(numericSn) && numericSn > maxSn) {
              maxSn = numericSn;
              lastProcess = rp;
            }
            // Sum up rejected quantities across all processes
            rp.productionTimesheets?.forEach((ts: any) => {
              rejectedQty += (Number(ts.rejectedQty) || 0);
            });
          });
        });

        if (lastProcess) {
          producedQty = (lastProcess as any)?.productionTimesheets?.reduce((sum: number, ts: any) => sum + (Number(ts?.completedQty) || 0), 0) || 0;
        }
      }

      // Cap at total
      producedQty = Math.min(producedQty, totalQty);

      let derivedStatus = wo.status || "Unknown";
      if (derivedStatus === "Completed" && wo.inProcesses && wo.inProcesses.length > 0) {
        const allCompleted = wo.inProcesses.every((ip: any) => 
          ip.routingProcesses.length > 0 && ip.routingProcesses.every((rp: any) => rp.status === "Completed")
        );
        if (!allCompleted) {
          derivedStatus = "WIP";
        }
      }

      return {
        workOrderNo: wo.workOrderNo,
        date: wo.date ? new Date(wo.date).toISOString() : null,
        customerName: wo.customer?.customerName || wo.CustomerProfile?.customerName || "-",
        jobDescription: wo.jobDescription || "-",
        deliveryDate: wo.deliveryDate ? new Date(wo.deliveryDate).toISOString() : null,
        uom: wo.uom || "",
        status: derivedStatus,
        qcAcceptance: wo.qcAcceptance,
        producedQty,
        rejectedQty,
        totalQty
      };
    });

    return (
      <WorkOrderList
        rows={enrichedWorkOrders}
        canCreate={hasCreatePermission}
        errorMsg={errorMsg ? String(errorMsg) : null}
        truncatedAt={workOrders.length >= LIST_LIMIT ? LIST_LIMIT : null}
      />
    );
  } catch (globalError: any) {
    // Details go to the server log only; users get a plain message, never a stack trace.
    console.error("Fatal error rendering work orders page:", globalError);
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-rose-700">
        <p className="text-sm font-semibold">The work order list couldn&apos;t be loaded.</p>
        <p className="mt-1 text-xs">Please refresh the page. If it keeps happening, contact your administrator.</p>
      </div>
    );
  }
}
