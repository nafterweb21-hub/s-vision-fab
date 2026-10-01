"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { addRoutingProcess } from "../actions";
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
  inProcessId: string;
  inProcessTargetDate: string; // YYYY-MM-DD — routing target may not exceed this
  mainProcesses: MainProcess[];
  processProfiles: ProcessProfile[];
  employees: { id: string; name: string; code: string }[];
  existingPairs?: Pair[]; // already-added main+routing combos in this in-process
  disabled?: boolean;
};

type FormValues = {
  mainProcessId: string;
  routingProcessId: string;
  assignedEmployeeId: string;
  targetCompletionDate: string;
  remark: string;
};

export default function AddRoutingProcessModal({
  inProcessId,
  inProcessTargetDate,
  mainProcesses,
  processProfiles,
  employees,
  existingPairs = [],
  disabled,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      mainProcessId: "",
      routingProcessId: "",
      assignedEmployeeId: "",
      targetCompletionDate: "",
      remark: "",
    },
  });

  const selectedMain = watch("mainProcessId");
  const usedRoutingIds = useMemo(
    () =>
      new Set(
        existingPairs
          .filter((p) => p.mainProcessId === selectedMain)
          .map((p) => p.routingProcessId),
      ),
    [existingPairs, selectedMain],
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
      const res = await addRoutingProcess({
        inProcessId,
        mainProcessId: data.mainProcessId,
        routingProcessId: data.routingProcessId,
        assignedEmployeeId: data.assignedEmployeeId,
        targetCompletionDate: data.targetCompletionDate,
        remark: data.remark,
      });
      if (!res.success) {
        setError(res.error || "An error occurred");
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded sm:rounded-lg text-[9px] sm:text-xs font-medium transition-colors disabled:opacity-50"
      >
        <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
        Add Routing Process
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-md sm:rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">Add Routing Process</h3>
              <button onClick={() => setOpen(false)} className="p-0.5 sm:p-1 hover:bg-slate-200 rounded-md text-slate-500">
                <X size={14} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-3 sm:mb-6 bg-red-50 text-red-600 p-2 sm:p-3 rounded-md sm:rounded-lg text-[9px] sm:text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form id="rp-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Main Process <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect {...register("mainProcessId", { required: true })} className={inputCls}>
                      <option value="">Select</option>
                      {mainProcesses.map((m) => (
                        <option key={m.id} value={m.id}>{m.process}</option>
                      ))}
                    </SearchableSelect>
                    {errors.mainProcessId && <p className="text-[8px] sm:text-xs text-red-500">Required</p>}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Routing Process <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      {...register("routingProcessId", { required: true })}
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
                    {errors.routingProcessId && <p className="text-[8px] sm:text-xs text-red-500">Required</p>}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 md:col-span-2">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Assigned Employee
                    </label>
                    <SearchableSelect {...register("assignedEmployeeId")} className={inputCls}>
                      <option value="">Select (Optional)</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="space-y-1 sm:space-y-1.5 md:col-span-2">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Target Completion Date <span className="text-red-500">*</span>
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
                      <p className="text-[8px] sm:text-xs text-red-500">{errors.targetCompletionDate.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-sm font-medium text-slate-700">Remark</label>
                  <textarea {...register("remark")} rows={2} className={inputCls} />
                </div>
              </form>
            </div>

            <div className="px-3 py-2 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sm:gap-3 shrink-0">
              <button onClick={() => setOpen(false)} className="px-2 py-1 sm:px-4 sm:py-2 border border-slate-200 text-slate-600 rounded sm:rounded-lg hover:bg-slate-100 text-[10px] sm:text-sm font-medium">
                Cancel
              </button>
              <button form="rp-form" type="submit" disabled={isPending} className="px-3 py-1 sm:px-5 sm:py-2 bg-blue-600 text-white rounded sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 text-[10px] sm:text-sm font-medium">
                {isPending ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function fmtDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

const inputCls =
  "w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500";
