"use client";
import { buttonClass } from "@/components/form-ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { editRoutingProcess } from "../actions";

type MainProcess = { id: string; process: string };
type ProcessProfile = {
  id: string;
  routingProcess: string;
  mainProcessId: string;
  welding: boolean;
  sprayPainting: boolean;
  machining: boolean;
};

type Pair = { mainProcessId: string; routingProcessId: string };

type Props = {
  routingProcess: any; // the existing routing process object
  inProcessTargetDate?: string;
  mainProcesses: MainProcess[];
  processProfiles: ProcessProfile[];
  existingPairs?: Pair[];
  employees?: any[];
  disabled?: boolean;
};

type FormValues = {
  mainProcessId: string;
  routingProcessId: string;
  targetCompletionDate: string;
  remark: string;
  assignedEmployeeId: string;
};

export default function EditRoutingProcessModal({
  routingProcess,
  inProcessTargetDate,
  mainProcesses,
  processProfiles,
  existingPairs = [],
  employees = [],
  disabled,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      mainProcessId: routingProcess?.mainProcessId || "",
      routingProcessId: routingProcess?.routingProcessId || "",
      targetCompletionDate: routingProcess?.targetCompletionDate ? new Date(routingProcess.targetCompletionDate).toISOString().slice(0, 10) : "",
      remark: routingProcess?.remark || "",
      assignedEmployeeId: routingProcess?.assignedEmployeeId || "",
    },
  });

  // Update default values if the routingProcess prop changes
  useEffect(() => {
    reset({
      mainProcessId: routingProcess?.mainProcessId || "",
      routingProcessId: routingProcess?.routingProcessId || "",
      targetCompletionDate: routingProcess?.targetCompletionDate ? new Date(routingProcess.targetCompletionDate).toISOString().slice(0, 10) : "",
      remark: routingProcess?.remark || "",
      assignedEmployeeId: routingProcess?.assignedEmployeeId || "",
    });
  }, [routingProcess, reset]);

  const selectedMain = watch("mainProcessId");
  const usedRoutingIds = useMemo(
    () =>
      new Set(
        existingPairs
          .filter((p) => p.mainProcessId === selectedMain && p.routingProcessId !== routingProcess?.routingProcessId)
          .map((p) => p.routingProcessId),
      ),
    [existingPairs, selectedMain, routingProcess],
  );
  const filteredRouting = useMemo(
    () =>
      processProfiles.filter(
        (p) => p.mainProcessId === selectedMain && !usedRoutingIds.has(p.id),
      ),
    [processProfiles, selectedMain, usedRoutingIds],
  );

  function onSubmit(data: FormValues) {
    setError("");
    startTransition(async () => {
      const res = await editRoutingProcess(routingProcess.id, {
        mainProcessId: data.mainProcessId,
        routingProcessId: data.routingProcessId,
        targetCompletionDate: data.targetCompletionDate,
        remark: data.remark,
        assignedEmployeeId: data.assignedEmployeeId,
      });
      if (!res.success) {
        setError(res.error || "An error occurred");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Edit Routing Process"
        className={buttonClass("secondary", "sm")}
      >
        <Pencil size={13} />
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">Edit Routing Process</h3>
              <button onClick={() => setOpen(false)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                  {error}
                </div>
              )}

              <form id={`edit-rp-form-${routingProcess.id}`} onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Main Process <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect 
                      {...register("mainProcessId", { required: true })} 
                      value={watch("mainProcessId")}
                      className={inputCls}
                    >
                      <option value="">Select</option>
                      {mainProcesses.map((m) => (
                        <option key={m.id} value={m.id}>{m.process}</option>
                      ))}
                    </SearchableSelect>
                    {errors.mainProcessId && <p className="text-[11px] font-medium text-rose-600">Required</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Routing Process <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("routingProcessId", { required: true })}
                      value={watch("routingProcessId")}
                      className={inputCls}
                      disabled={!selectedMain}
                    >
                      <option value="">Select</option>
                      {filteredRouting.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.routingProcess}
                          {p.welding ? " (Welding)" : ""}
                          {p.sprayPainting ? " (Spray)" : ""}
                          {p.machining ? " (Machining)" : ""}
                        </option>
                      ))}
                    </SearchableSelect>
                    {errors.routingProcessId && <p className="text-[11px] font-medium text-rose-600">Required</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Target Completion Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      max={inProcessTargetDate || "2035-12-31"}
                      {...register("targetCompletionDate", {
                        required: "Required",
                        validate: (val) => {
                          if (inProcessTargetDate && val > inProcessTargetDate) {
                            return `Cannot exceed In-Process target date (${inProcessTargetDate})`;
                          }
                          return true;
                        }
                      })}
                      className={inputCls}
                    />
                    {errors.targetCompletionDate && (
                      <p className="text-[11px] font-medium text-rose-600">{errors.targetCompletionDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Assigned Employee
                    </label>
                    <SearchableSelect 
                      {...register("assignedEmployeeId")} 
                      value={watch("assignedEmployeeId")}
                      className={inputCls}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </SearchableSelect>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Remark</label>
                  <textarea {...register("remark")} rows={2} className={inputCls} />
                </div>
              </form>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <button onClick={() => setOpen(false)} className={buttonClass("ghost", "md")}>
                Cancel
              </button>
              <button form={`edit-rp-form-${routingProcess.id}`} type="submit" disabled={isPending} className={buttonClass("primary", "md")}>
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
