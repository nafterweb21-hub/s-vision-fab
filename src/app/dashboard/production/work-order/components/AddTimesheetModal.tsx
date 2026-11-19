"use client";
import { buttonClass, checkboxClass } from "@/components/form-ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, X, Pencil } from "lucide-react";
import { upsertTimesheet } from "../actions";
import { useRouter } from "next/navigation";
type AddTimesheetModalProps = {
  workOrderNo: string;
  employees: { id: string; name: string; code: string }[];
  routingProcesses: { id: string; name: string; description: string }[];
  timesheet?: any;
};

export default function AddTimesheetModal({ workOrderNo, employees, routingProcesses, timesheet }: AddTimesheetModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      routingProcessId: timesheet?.routingProcessId || "",
      employeeId: timesheet?.employeeId || "",
      timeIn: timesheet?.timeIn ? new Date(timesheet.timeIn).toISOString().slice(0, 16) : "",
      timeOut: timesheet?.timeOut ? new Date(timesheet.timeOut).toISOString().slice(0, 16) : "",
      completed: timesheet?.completed || false,
      completedQty: timesheet?.completedQty || "",
      machineCodes: timesheet?.machineCodes || ""
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await upsertTimesheet({
        id: timesheet?.id,
        workOrderNo,
        routingProcessId: data.routingProcessId,
        employeeId: data.employeeId,
        timeIn: data.timeIn || undefined,
        timeOut: data.timeOut || undefined,
        completed: data.completed,
        completedQty: data.completedQty || undefined,
        machineCodes: data.machineCodes || undefined
      });

      if (result.success) {
        setIsOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error || "An error occurred");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add timesheet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {timesheet ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          title="Edit Timesheet"
        >
          <Pencil size={14} />
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className={buttonClass("primary", "md")}
        >
          <Plus size={14} />
          Add Timesheet
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">{timesheet ? 'Edit Production Timesheet' : 'Add Production Timesheet'}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                  {error}
                </div>
              )}

              <form id="timesheet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Process <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("routingProcessId", { required: true })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="">Select Process</option>
                      {routingProcesses.map(rp => (
                        <option key={rp.id} value={rp.id}>
                          {rp.name} ({rp.description})
                        </option>
                      ))}
                    </SearchableSelect>
                    {errors.routingProcessId && <p className="text-[11px] font-medium text-rose-600">Process is required</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Employee <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("employeeId", { required: true })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code})
                        </option>
                      ))}
                    </SearchableSelect>
                    {errors.employeeId && <p className="text-[11px] font-medium text-rose-600">Employee is required</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Time In</label>
                    <input
                      type="datetime-local"
                      {...register("timeIn")}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Time Out</label>
                    <input
                      type="datetime-local"
                      {...register("timeOut")}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Total minutes will be calculated automatically.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Completed Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("completedQty")}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="e.g. 50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Machine Code(s)</label>
                    <input
                      {...register("machineCodes")}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="e.g. MC-01, MC-02"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="completed"
                    {...register("completed")}
                    className={checkboxClass}
                  />
                  <label htmlFor="completed" className="text-xs font-medium text-slate-600">Mark as Completed</label>
                </div>
              </form>
            </div>
            
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={buttonClass("ghost", "md")}
              >
                Cancel
              </button>
              <button
                form="timesheet-form"
                type="submit"
                disabled={isSubmitting}
                className={buttonClass("primary", "md")}
              >
                {isSubmitting ? "Saving..." : timesheet ? "Save Changes" : "Add Timesheet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
