"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateInProcess } from "../actions";

type ExistingStep = { id: string; sn: number | null; description: string };

type Props = {
  inProcess: any;
  existingSteps: ExistingStep[];
  disabled?: boolean;
};

type FormValues = {
  description: string;
  targetCompletionDate: string;
  conditionalSnId: string;
  allFlag: boolean;
  remark: string;
};

export default function EditInProcessModal({ inProcess, existingSteps, disabled }: Props) {
  const [isOpen, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      description: inProcess?.description || "",
      targetCompletionDate: inProcess?.targetCompletionDate ? new Date(inProcess.targetCompletionDate).toISOString().slice(0, 10) : "",
      conditionalSnId: inProcess?.conditionalSnId || "",
      allFlag: !!inProcess?.allFlag,
      remark: inProcess?.remark || "",
    },
  });

  useEffect(() => {
    reset({
      description: inProcess?.description || "",
      targetCompletionDate: inProcess?.targetCompletionDate ? new Date(inProcess.targetCompletionDate).toISOString().slice(0, 10) : "",
      conditionalSnId: inProcess?.conditionalSnId || "",
      allFlag: !!inProcess?.allFlag,
      remark: inProcess?.remark || "",
    });
  }, [inProcess, reset]);

  function onSubmit(data: FormValues) {
    setError("");
    startTransition(async () => {
      const res = await updateInProcess(inProcess.id, {
        description: data.description,
        targetCompletionDate: data.targetCompletionDate,
        conditionalSnId: data.conditionalSnId || null,
        allFlag: data.allFlag,
        remark: data.remark,
      });
      if (!res.success) {
        setError(res.error || "An error occurred");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  // Prevent selecting itself as conditional SN
  const validExistingSteps = existingSteps.filter(s => s.id !== inProcess.id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Edit In-Process"
        className="text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 inline-flex items-center gap-1"
      >
        <Pencil size={10} className="sm:w-3 sm:h-3" />
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-md sm:rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[11px] sm:text-lg font-semibold text-slate-800">Edit In-Process</h3>
              <button onClick={() => setOpen(false)} className="p-0.5 sm:p-1 hover:bg-slate-200 rounded-md text-slate-500">
                <X size={14} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto">
              {error && (
                <div className="mb-3 sm:mb-6 bg-red-50 text-red-600 p-2 sm:p-3 rounded-md sm:rounded-lg text-[9px] sm:text-sm border border-red-200">
                  {error}
                </div>
              )}

              <form id={`edit-in-process-form-${inProcess.id}`} onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-6">
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                    Inprocess Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("description", { required: true })}
                    className={inputCls}
                    placeholder="e.g. Body Frame Assembly"
                  />
                  {errors.description && <p className="text-[8px] sm:text-xs text-red-500">Inprocess Name is required</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">
                      Target Completion Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" {...register("targetCompletionDate", { required: true })} className={inputCls} />
                    {errors.targetCompletionDate && <p className="text-[8px] sm:text-xs text-red-500">Date is required</p>}
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[10px] sm:text-sm font-medium text-slate-700">Conditional SN</label>
                    <SearchableSelect 
                      {...register("conditionalSnId")} 
                      value={watch("conditionalSnId")}
                      className={inputCls}
                    >
                      <option value="">None</option>
                      {validExistingSteps.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.sn ? `${s.sn}. ` : ""}{s.description}
                        </option>
                      ))}
                    </SearchableSelect>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input type="checkbox" id={`allFlag-${inProcess.id}`} {...register("allFlag")} className="w-3 h-3 sm:w-4 sm:h-4 rounded border-slate-300 text-blue-600" />
                  <label htmlFor={`allFlag-${inProcess.id}`} className="text-[10px] sm:text-sm font-medium text-slate-700">All</label>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-sm font-medium text-slate-700">Remark</label>
                  <textarea {...register("remark")} rows={2} className={inputCls} />
                </div>
              </form>
            </div>

            <div className="px-3 py-2 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sm:gap-3">
              <button onClick={() => setOpen(false)} className="px-2 py-1 sm:px-4 sm:py-2 border border-slate-200 text-slate-600 rounded sm:rounded-lg hover:bg-slate-100 text-[10px] sm:text-sm font-medium">
                Cancel
              </button>
              <button form={`edit-in-process-form-${inProcess.id}`} type="submit" disabled={isPending} className="px-3 py-1 sm:px-5 sm:py-2 bg-blue-600 text-white rounded sm:rounded-lg hover:bg-blue-700 disabled:opacity-50 text-[10px] sm:text-sm font-medium">
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
  "w-full px-2 py-1 sm:px-3 sm:py-2 border border-slate-200 rounded sm:rounded-lg text-[10px] sm:text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors";
