-- Print toggle: show each routing process's assigned employee on the Work Order printout.
ALTER TABLE "WorkOrder" ADD COLUMN "printAssignedEmployee" BOOLEAN NOT NULL DEFAULT false;
