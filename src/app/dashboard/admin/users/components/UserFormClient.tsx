"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Role = string;

interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  email: string;
}

type FormState = {
  id?: string;
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: Role;
  isActive: boolean;
  employeeId: string;
};

export default function UserFormClient({
  initialData,
  currentUserId,
}: {
  initialData?: FormState;
  currentUserId: string;
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState>(
    initialData || {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "VIEWER",
      isActive: true,
      employeeId: "",
    }
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [employeeScanCode, setEmployeeScanCode] = useState("");

  const handleScanEmployee = (code: string) => {
    setEmployeeScanCode(code);
    if (!code) return;
    
    // Auto-fetch if exact match is found
    const match = employees.find((e) => e.code.toLowerCase() === code.toLowerCase());
    if (match) {
      setForm((prev) => ({
        ...prev,
        name: match.name,
        email: match.email || prev.email,
        employeeId: match.id,
      }));
    }
  };
  
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => {
        setEmployees(
          data.map((e: { id: string; code: string; name: string; email: string }) => ({
            id: e.id,
            code: e.code,
            name: e.name,
            email: e.email,
          }))
        );
      })
      .catch(() => {});

    fetch("/api/admin/roles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoles(data);
        }
      })
      .catch(() => {});
  }, []);

  const isEdit = !!initialData?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.password && form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const url = isEdit ? `/api/admin/users/${form.id}` : "/api/admin/users";
    const method = isEdit ? "PUT" : "POST";
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      isActive: form.isActive,
      employeeId: form.employeeId || null,
    };
    if (!isEdit || form.password) payload.password = form.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Request failed.");
        setSubmitting(false);
        return;
      }
      
      router.push("/dashboard/admin/users");
      router.refresh();
    } catch (err) {
      setFormError("An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 py-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-blue-900">
          {isEdit ? "Edit User" : "Add User"}
        </h1>
        <p className="mt-1 text-sm text-blue-500">
          {isEdit ? "Modify user details below." : "Create a new user for the system."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-5">
          {!isEdit && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 mb-2">
              <label className="mb-1 block text-sm font-semibold text-emerald-800">
                Employee ID Scanner
              </label>
              <input
                type="text"
                value={employeeScanCode}
                onChange={(e) => handleScanEmployee(e.target.value)}
                placeholder="Scan or type Employee ID to autofill details..."
                className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-700">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-700">
              Password{" "}
              {isEdit ? (
                <span className="font-normal text-blue-400">(leave blank to keep current)</span>
              ) : (
                <span className="text-rose-500">*</span>
              )}
            </label>
            <input
              type="password"
              required={!isEdit}
              minLength={!isEdit ? 8 : undefined}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-700">
              Confirm Password{" "}
              {isEdit ? (
                <span className="font-normal text-blue-400">(leave blank if not changing)</span>
              ) : (
                <span className="text-rose-500">*</span>
              )}
            </label>
            <input
              type="password"
              required={!isEdit || !!form.password}
              minLength={!isEdit || !!form.password ? 8 : undefined}
              value={form.confirmPassword || ""}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-blue-700">
                Role <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                disabled={isEdit && form.id === currentUserId}
                className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">— Select a role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </SearchableSelect>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-blue-700">Status</label>
              <SearchableSelect
                value={form.isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === "ACTIVE" })}
                disabled={isEdit && form.id === currentUserId}
                className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SearchableSelect>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-blue-700">
              Linked Employee
            </label>
            <SearchableSelect
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">— Not linked —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} — {emp.name}
                </option>
              ))}
            </SearchableSelect>
          </div>
        </div>

        {formError && (
          <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-200">
            {formError}
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-blue-100">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="rounded-xl border border-blue-200 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60 shadow-md transition-all"
          >
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
