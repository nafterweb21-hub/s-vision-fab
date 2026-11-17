"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { RecordStatus, normalizeRecordStatus } from "@/lib/status";
interface Employee {
  id: string;
  code: string;
  name: string;
  aadharNumber: string;
  designation: string | null;
  email: string;
  mobileNo: string | null;
  gender: string | null;
  doj: string | null;
  employmentType: string | null;
  status: string;
  roleProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [designations, setDesignations] = useState<{ id: string; designation: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    aadharNumber: "",
    designation: "",
    email: "",
    mobileNo: "",
    gender: "Male",
    doj: "",
    employmentType: "Citizen",
    // Widened so the toggle can assign Inactive; without it TypeScript
    // infers the literal "Active" from the initial value.
    status: RecordStatus.Active as RecordStatus,
    roleProfileId: "",
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Fetch designations
  useEffect(() => {
    if (!id) return;
    const fetchDesignations = async () => {
      try {
        const { getDesignationProfileItems } = await import("../../../designation/actions");
        const res = await getDesignationProfileItems();
        if (res.success && res.data) {
          setDesignations(res.data.filter((d: any) => d.status === "Active"));
        }
      } catch (error) {
        console.error("Failed to load designations", error);
      }
    };
    fetchDesignations();

    const fetchRoles = async () => {
      try {
        const { getActiveRoleProfiles } = await import("@/lib/roles.actions");
        setRoles(await getActiveRoleProfiles());
      } catch (error) {
        console.error("Failed to load roles", error);
      }
    };
    fetchRoles();
  }, []);

  // Fetch all employees and find by ID
  useEffect(() => {
    if (!id) return;
    const fetchEmployee = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const list: Employee[] = await res.json();
          const emp = list.find((e) => e.id === id);
          if (emp) {
            setFormData({
              code: emp.code,
              name: emp.name,
              aadharNumber: emp.aadharNumber,
              designation: emp.designation || "",
              email: emp.email,
              mobileNo: emp.mobileNo || "",
              gender: emp.gender || "Male",
              doj: emp.doj || "",
              employmentType: emp.employmentType || "Citizen",
              // The API returns a plain string; fall back to Active if the
              // stored value is an unrecognised legacy spelling.
              status: normalizeRecordStatus(emp.status) ?? RecordStatus.Active,
              roleProfileId: emp.roleProfileId || "",
            });
          } else {
            showToast("error", "Employee profile not found.");
          }
        } else {
          showToast("error", "Failed to retrieve employee profile.");
        }
      } catch (error) {
        console.error(error);
        showToast("error", "Network error retrieving employee.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchEmployee();
    }
  }, [id]);

  // Form validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.code.trim()) errors.code = "Employee Code is required.";
    
    if (!formData.aadharNumber.trim()) {
      errors.aadharNumber = "Aadhar Number is required.";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email address format.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        showToast("success", `Employee "${formData.name}" successfully updated.`);
        setTimeout(() => {
          router.push("/dashboard/master-profile/employee");
          router.refresh();
        }, 1200);
      } else {
        showToast("error", result.error || "Failed to save updates.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Network error updating employee profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const employmentTypes = [
    "Citizen",
    "PR",
    "Employment Pass",
    "S Pass",
    "Work Permit",
  ];

  return (
    <div className="flex-1 py-3 space-y-4 w-full">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] flex items-center gap-3 px-6 py-5 rounded-2xl shadow-2xl border text-base transition-all duration-300 transform scale-100 min-w-[300px] justify-center ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/master-profile/employee"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 text-blue-500 hover:text-blue-950 :text-white hover:bg-blue-50 :bg-blue-800 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-blue-900 ">
            Edit Employee Profile
          </h1>
          <p className="text-xs text-blue-500 mt-0.5">
            Modify details for employee code: <span className="font-mono font-bold text-blue-700 ">{formData.code || "..."}</span>
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm">
        {isLoading ? (
          // Simple loading indicator
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
            <p className="text-sm text-blue-500">Loading profile details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Employee Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g. EMP005"
                  className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 ${
                    formErrors.code
                      ? "border-rose-400 "
                      : "border-blue-200 "
                  }`}
                />
                {formErrors.code && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">
                    {formErrors.code}
                  </p>
                )}
              </div>

              {/* Name (IMMUTABLE) */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Employee Name
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.name}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm text-blue-400 bg-blue-100 cursor-not-allowed"
                />
                <span className="text-[10px] text-amber-500 font-semibold mt-1 block">
                  Note: Employee Name is immutable once saved.
                </span>
              </div>

              {/* Aadhar Number */}
            <div className="group">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800 mb-1 ml-1">
                Aadhar Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.aadharNumber}
                onChange={(e) =>
                  setFormData({ ...formData, aadharNumber: e.target.value })
                }
                className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 ${formErrors.aadharNumber
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-blue-100 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                placeholder="e.g. 123456789012"
              />
              {formErrors.aadharNumber && (
                <p className="mt-1.5 ml-1 text-xs font-medium text-rose-500">
                  {formErrors.aadharNumber}
                </p>
              )}
            </div>

              {/* Designation */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Designation
                </label>
                <SearchableSelect
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      designation: e.target.value,
                    })
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 "
                >
                  <option value="">-- Select Designation --</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.designation}>
                      {d.designation}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Role (drives production-terminal process access) */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Role
                </label>
                <SearchableSelect
                  value={formData.roleProfileId}
                  onChange={(e) =>
                    setFormData({ ...formData, roleProfileId: e.target.value })
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 "
                >
                  <option value="">-- No Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </SearchableSelect>
                <span className="text-[10px] text-blue-400 mt-1 block">
                  Controls which routing processes this operator can run in the terminal.
                </span>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="e.g. user@visionone.com"
                  className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 ${
                    formErrors.email
                      ? "border-rose-400 "
                      : "border-blue-200 "
                  }`}
                />
                {formErrors.email && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Employment Type
                </label>
                <SearchableSelect
                  value={formData.employmentType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employmentType: e.target.value,
                    })
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 "
                >
                  {employmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              {/* Mobile No */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Mobile No
                </label>
                <input
                  type="text"
                  value={formData.mobileNo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mobileNo: e.target.value,
                    })
                  }
                  placeholder="e.g. 98765432"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 "
                />
              </div>

              {/* DOJ */}
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                DOJ
              </label>
              <input
                type="date"
                value={formData.doj}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    doj: e.target.value,
                  })
                }
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-100 bg-blue-50/50 text-sm text-blue-900 transition-all hover:bg-blue-50 hover:border-blue-200 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide">
                  Gender
                </label>
                <SearchableSelect
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-blue-900 bg-blue-50/50 "
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </SearchableSelect>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 border border-blue-200 ">
                <div>
                  <h4 className="text-xs font-bold text-blue-800 ">
                    Active Status
                  </h4>
                  <p className="text-[10px] text-blue-400 mt-0.5">
                    Toggled off set the employee profile to inactive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      status:
                        formData.status === RecordStatus.Active
                          ? RecordStatus.Inactive
                          : RecordStatus.Active,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.status === RecordStatus.Active
                      ? "bg-emerald-500"
                      : "bg-blue-300 "
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.status === RecordStatus.Active
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-blue-200 ">
              <Link
                href="/dashboard/master-profile/employee"
                className="px-5 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-200/40 :bg-blue-800 text-xs font-bold text-blue-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
