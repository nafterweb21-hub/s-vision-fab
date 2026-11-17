"use client";
import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { RecordStatus } from "@/lib/status";
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
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeProfilePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employmentFilter, setEmploymentFilter] = useState("ALL");



  // UI notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);


  const [showAadharMap, setShowAadharMap] = useState<{ [key: string]: boolean }>({});
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  }, []);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      } else {
        showToast("error", "Failed to load employees from database fallback.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Error connecting to backend API.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchEmployees();
    });
  }, [fetchEmployees]);

  // Aadhar masker
  const maskAadhar = (aadhar: string, reveal: boolean) => {
    if (!aadhar) return "—";
    if (reveal) return aadhar;
    if (aadhar.length <= 4) return "****";
    // Mask as XXXX-XXXX-1234
    const last4 = aadhar.substring(aadhar.length - 4);
    return `••••-••••-${last4}`;
  };

  const toggleAadharReveal = (id: string) => {
    setShowAadharMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };



  // Direct toggle status badge in table
  const handleToggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === RecordStatus.Active ? RecordStatus.Inactive : RecordStatus.Active;
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emp,
          status: newStatus,
        }),
      });

      if (res.ok) {
        showToast(
          "success",
          `Status of ${emp.name} updated to ${newStatus}.`
        );
        fetchEmployees();
      } else {
        const result = await res.json();
        showToast("error", result.error || "Failed to update status.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Error toggling employee status.");
    }
  };

  // Confirm and execute employee deletion (logical deactivation)
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("success", `Employee "${employeeToDelete.name}" has been deactivated successfully.`);
        setEmployeeToDelete(null);
        fetchEmployees();
      } else {
        const result = await res.json();
        showToast("error", result.error || "Failed to deactivate employee.");
      }
    } catch (error) {
      console.error(error);
      showToast("error", "Error deactivating employee.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.designation &&
          emp.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
        emp.aadharNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || emp.status === statusFilter;

      const matchesEmployment =
        employmentFilter === "ALL" || emp.employmentType === employmentFilter;

      return matchesSearch && matchesStatus && matchesEmployment;
    });
  }, [employees, searchQuery, statusFilter, employmentFilter]);

  const employmentTypes = [
    "Citizen",
    "PR",
    "Employment Pass",
    "S Pass",
    "Work Permit",
  ];

  return (
    <div className="flex-1 flex flex-col py-3 space-y-4 w-full">
      {/* Toast Notification Banner */}
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

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900 ">
            Employee Profiles
          </h1>
          <p className="text-sm text-blue-500 mt-1">
            Manage system operators, welders, inspectors, and organizational personnel.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/master-profile/employee/new"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Employee
          </Link>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="grid gap-4 md:grid-cols-12 bg-white p-5 rounded-2xl border border-blue-200 shadow-sm">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-blue-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, employee code, Aadhar Number, email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-sm focus:bg-white :bg-blue-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-150 text-blue-900 placeholder-blue-400 "
          />
        </div>

        {/* Filter status */}
        <div className="md:col-span-3">
          <SearchableSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-sm focus:bg-white :bg-blue-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-150 text-blue-700 "
          >
            <option value="ALL">All Statuses</option>
            <option value={RecordStatus.Active}>Active Only</option>
            <option value={RecordStatus.Inactive}>Inactive Only</option>
          </SearchableSelect>
        </div>

        {/* Filter employment type */}
        <div className="md:col-span-3">
          <SearchableSelect
            value={employmentFilter}
            onChange={(e) => setEmploymentFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-sm focus:bg-white :bg-blue-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-150 text-blue-700 "
          >
            <option value="ALL">All Employment Types</option>
            {employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SearchableSelect>
        </div>
      </div>

      {/* Main Grid/Table */}
      <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm flex-1 flex flex-col">
        {isLoading ? (
          // Loading Skeletons
          <div className="p-6 space-y-4 flex-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-center animate-pulse">
                <div className="h-10 bg-blue-100 rounded-lg w-12" />
                <div className="h-6 bg-blue-100 rounded-md flex-1" />
                <div className="h-6 bg-blue-100 rounded-md w-32" />
                <div className="h-6 bg-blue-100 rounded-md w-20" />
              </div>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-400 border border-blue-200/60 ">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-900 ">No employees found</h3>
              <p className="text-sm text-blue-500 mt-1">
                There are no employee profiles matching the search queries or filters. Try adjusting your settings.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setEmploymentFilter("ALL");
              }}
              className="px-4 py-2 rounded-xl border border-blue-200 text-xs font-semibold hover:bg-blue-50 :bg-blue-800/80 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          // Employee List Table
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-blue-500 ">
              <thead className="bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-600 border-b border-blue-200 ">
                <tr>
                  <th className="px-6 py-4 font-semibold">Code</th>
                  <th className="px-6 py-4 font-semibold">Employee Details</th>
                  <th className="px-6 py-4 font-semibold">Aadhar Number</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold">Employment Type</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200 ">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-blue-50/50 :bg-blue-900/30 transition-colors group"
                  >
                    {/* Code */}
                    <td className="px-6 py-4 font-mono font-bold text-blue-900 ">
                      {emp.code}
                    </td>
                    {/* Details */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-blue-900 ">
                          {emp.name}
                        </span>
                        <span className="text-xs text-blue-400 mt-0.5">
                          {emp.designation || "No designation"}
                        </span>
                      </div>
                    </td>
                    {/* Aadhar Number */}
                    <td className="px-6 py-4 font-mono text-blue-700 ">
                      <div className="flex items-center gap-2">
                        <span>{maskAadhar(emp.aadharNumber, showAadharMap[emp.id])}</span>
                        <button
                          onClick={() => toggleAadharReveal(emp.id)}
                          className="text-blue-400 hover:text-blue-600 :text-blue-200 p-1 rounded-md transition-colors"
                          title="Reveal / Mask Aadhar"
                        >
                          {showAadharMap[emp.id] ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs">
                        <a
                          href={`mailto:${emp.email}`}
                          className="hover:underline text-cyan-600 font-medium truncate max-w-[180px]"
                        >
                          {emp.email}
                        </a>
                        <div className="text-blue-400 mt-1 font-mono flex flex-col">
                          <span>{emp.mobileNo ? `Mobile: ${emp.mobileNo}` : "—"}</span>
                          <span>{emp.doj ? `DOJ: ${new Date(emp.doj).toLocaleDateString()}` : ""}</span>
                        </div>
                      </div>
                    </td>
                    {/* Employment */}
                    <td className="px-6 py-4 text-blue-700 ">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 ">
                        {emp.employmentType || "—"}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer ${
                          emp.status === RecordStatus.Active
                            ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                            : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30"
                        }`}
                      >
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${emp.status === RecordStatus.Active ? "bg-emerald-500 animate-pulse" : "bg-blue-400"}`} />
                        {emp.status}
                      </button>
                    </td>
                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/master-profile/employee/${emp.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:text-blue-950 :text-white hover:bg-blue-100 :bg-blue-800/80 hover:border-blue-300 :border-blue-700 transition-all duration-150"
                          title="Edit Profile"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEmployeeToDelete(emp)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-600 :bg-rose-950/30 transition-all duration-150 cursor-pointer"
                          title="Deactivate Profile"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Deletion Confirmation Modal */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass backdrop */}
          <div 
            className="absolute inset-0 bg-blue-950/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => !isDeleting && setEmployeeToDelete(null)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white border border-blue-200 p-6 text-left align-middle shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
            {/* Warning Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 ">
                  Deactivate Employee Profile
                </h3>
                <p className="text-xs text-blue-500 ">
                  This action will set the employee status to INACTIVE.
                </p>
              </div>
            </div>

            {/* Employee Info Block */}
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-150 ">
              <div className="grid grid-cols-3 gap-y-2 text-xs">
                <span className="text-blue-400 font-medium">Code:</span>
                <span className="col-span-2 text-blue-900 font-mono font-bold">{employeeToDelete.code}</span>
                
                <span className="text-blue-400 font-medium">Name:</span>
                <span className="col-span-2 text-blue-900 font-semibold">{employeeToDelete.name}</span>
                
                <span className="text-blue-400 font-medium">Designation:</span>
                <span className="col-span-2 text-blue-900 ">{employeeToDelete.designation || "—"}</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-blue-600 leading-relaxed">
              Are you sure you want to deactivate this employee? This will set their status to INACTIVE and they will not be available for selection on new records.
            </p>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 :bg-blue-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-sm font-semibold text-white shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deactivating...
                  </>
                ) : (
                  "Confirm Deactivate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
