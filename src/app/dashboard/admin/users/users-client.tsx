"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { customConfirm } from "@/lib/customConfirm";
type Role =
  | "ADMIN"
  | "SALES"
  | "PRODUCTION"
  | "PURCHASING"
  | "QC"
  | "PLANNER"
  | "VIEWER";

const ROLES: Role[] = ["ADMIN", "SALES", "PRODUCTION", "PURCHASING", "QC", "PLANNER", "VIEWER"];

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  employeeId: string | null;
  employee?: { id: string; code: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface EmployeeOption {
  id: string;
  code: string;
  name: string;
}

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | Role>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    else showToast("error", "Failed to load users.");
    setLoading(false);
  }, [showToast]);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    if (res.ok) {
      const data = await res.json();
      setEmployees(
        data.map((e: { id: string; code: string; name: string }) => ({
          id: e.id,
          code: e.code,
          name: e.name,
        })),
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, [fetchUsers, fetchEmployees]);

  const handleDelete = async (u: User) => {
    if (!await customConfirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast("error", data.error || "Failed to delete user.");
      return;
    }
    showToast("success", `Deleted ${u.email}.`);
    fetchUsers();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchesQ =
        !q ||
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.employee?.name ?? "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? u.isActive : !u.isActive);
      return matchesQ && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="flex w-full flex-1 flex-col gap-4 py-3">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl border px-5 py-4 text-sm shadow-2xl ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">User Management</h1>
          <p className="mt-1 text-sm text-blue-500">
            Create system users, assign roles, and link them to employees.
          </p>
        </div>
        <Link
          href="/dashboard/admin/users/create"
          className="rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-cyan-600 hover:to-blue-700"
        >
          + Add User
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
        <input
          type="text"
          placeholder="Search by name, email, employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        />
        <div className="w-full sm:w-64 shrink-0">
          <SearchableSelect
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "ALL" | Role)}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SearchableSelect>
        </div>
        <div className="w-full sm:w-64 shrink-0">
          <SearchableSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </SearchableSelect>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-blue-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-blue-500">No users match the filters.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-600">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Linked Employee</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/50">
                  <td className="px-6 py-4 font-semibold text-blue-900">
                    {u.name || <span className="text-blue-300">—</span>}
                    {u.id === currentUserId && (
                      <span className="ml-2 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-blue-700">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-blue-700">
                    {u.employee ? (
                      <span>
                        <span className="font-mono text-xs text-blue-500">{u.employee.code}</span>{" "}
                        {u.employee.name}
                      </span>
                    ) : (
                      <span className="text-blue-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                        u.isActive
                          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border border-rose-500/30 bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/users/${u.id}/edit`}
                        className="inline-block rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUserId || deleting}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


    </div>
  );
}
