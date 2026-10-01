"use client";
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
          className="p-0.5 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="Edit Timesheet"
        >
          <Pencil size={12} className="sm:w-4 sm:h-4" />
        </button>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 sm:px-4 sm:py-2 rounded sm:rounded-lg text-[9px] sm:text-sm font-medium transition-colors"
        >
          <Plus size={12} className="sm:w-4 sm:h-4" />
          Add Timesheet
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-md sm:rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">{timesheet ? 'Edit Production Timesheet' : 'Add Production Timesheet'}</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-0.5 sm:p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
              >
                <X size={14} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <div className="p-3 sm:p-6 overflow-y-auto">
              {error && (
                <div className="mb-3 sm:mb-6 bg-red-50 text-red-600 p-2 sm:p-4 rounded sm:rounded-lg text-[9px] sm:text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form id="timesheet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Process <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("routingProcessId", { required: true })}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select Process</option>
                      {routingProcesses.map(rp => (
                        <option key={rp.id} value={rp.id}>
                          {rp.name} ({rp.description})
                        </option>
                      ))}
                    </SearchableSelect>
                    {errors.routingProcessId && <p className="text-[8px] sm:text-xs text-red-500">Process is required</p>}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Employee <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("employeeId", { required: true })}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code})
                        </option>
                      ))}
                    </SearchableSelect>
                    {errors.employeeId && <p className="text-[8px] sm:text-xs text-red-500">Employee is required</p>}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">Time In</label>
                    <input
                      type="datetime-local"
                      {...register("timeIn")}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">Time Out</label>
                    <input
                      type="datetime-local"
                      {...register("timeOut")}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Total minutes will be calculated automatically.</p>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">Completed Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("completedQty")}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                      placeholder="e.g. 50"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">Machine Code(s)</label>
                    <input
                      {...register("machineCodes")}
                      className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                      placeholder="e.g. MC-01, MC-02"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                  <input
                    type="checkbox"
                    id="completed"
                    {...register("completed")}
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="completed" className="text-[10px] sm:text-sm font-medium text-slate-700">Mark as Completed</label>
                </div>
              </form>
            </div>
            
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 sm:px-4 sm:py-2 border border-slate-200 text-slate-600 rounded sm:rounded-lg hover:bg-slate-100 transition-colors text-[10px] sm:text-sm font-medium"
              >
                Cancel
              </button>
              <button
                form="timesheet-form"
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-1 sm:px-5 sm:py-2 bg-blue-600 text-white rounded sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-[10px] sm:text-sm font-medium shadow-sm shadow-blue-500/20"
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
