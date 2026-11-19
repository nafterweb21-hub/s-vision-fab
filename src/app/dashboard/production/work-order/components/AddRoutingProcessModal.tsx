"use client";
import { buttonClass } from "@/components/form-ui";
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
        className={buttonClass("secondary", "sm")}
      >
        <Plus size={13} />
        Add Routing Process
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">Add Routing Process</h3>
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

              <form id="rp-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Main Process <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect {...register("mainProcessId", { required: true })} className={inputCls}>
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

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-600">
                      Assigned Employee
                    </label>
                    <SearchableSelect {...register("assignedEmployeeId")} className={inputCls}>
                      <option value="">Select (Optional)</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="space-y-1 md:col-span-2">
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
              <button form="rp-form" type="submit" disabled={isPending} className={buttonClass("primary", "md")}>
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
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
