"use client";
import { buttonClass, checkboxClass } from "@/components/form-ui";
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
        className={buttonClass("secondary", "sm")}
      >
        <Pencil size={13} />
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">Edit In-Process</h3>
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

              <form id={`edit-in-process-form-${inProcess.id}`} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Inprocess Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register("description", { required: true })}
                    className={inputCls}
                    placeholder="e.g. Body Frame Assembly"
                  />
                  {errors.description && <p className="text-[11px] font-medium text-rose-600">Inprocess Name is required</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      Target Completion Date <span className="text-rose-500">*</span>
                    </label>
                    <input type="date" {...register("targetCompletionDate", { required: true })} className={inputCls} />
                    {errors.targetCompletionDate && <p className="text-[11px] font-medium text-rose-600">Date is required</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Conditional SN</label>
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

                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`allFlag-${inProcess.id}`} {...register("allFlag")} className={checkboxClass} />
                  <label htmlFor={`allFlag-${inProcess.id}`} className="text-xs font-medium text-slate-600">All</label>
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
              <button form={`edit-in-process-form-${inProcess.id}`} type="submit" disabled={isPending} className={buttonClass("primary", "md")}>
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
