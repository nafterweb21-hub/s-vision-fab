"use client";
// src/app/dashboard/profiles/process-profiles/edit/[id]/page.tsx

import { SearchableSelect } from "@/components/SearchableSelect";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useParams } from "next/navigation";
interface ProcessProfile {
  id: string;
  mainProcessId: string;
  mainProcess?: { process: string };
  routingProcess: string;
  welding: boolean;
  sprayPainting: boolean;
  machining: boolean;
  costPerMinute: number;
  remark: string | null;
  status: string;
}

export default function EditProcessProfilePage() {
  const router = useRouter();
  const params = useParams(); // { id }
  const { id } = params as { id: string };

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    mainProcessId: "",
    welding: false,
    sprayPainting: false,
    machining: false,
    costPerMinute: "",
    remark: "",
    status: "Active",
  });

  // Load existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profiles/process-profiles/${id}`);
        if (!res.ok) throw new Error("Failed to load profile.");
        const data: ProcessProfile = await res.json();
        setFormData({
          mainProcessId: data.mainProcessId,
          welding: data.welding,
          sprayPainting: data.sprayPainting,
          machining: data.machining,
          costPerMinute: data.costPerMinute.toString(),
          remark: data.remark ?? "",
          status: data.status,
        });
      } catch (e: any) {
        setErrorMsg(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        costPerMinute: parseFloat(formData.costPerMinute),
      };
      const res = await fetch(`/api/profiles/process-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update profile.");
      }
      router.replace(`/dashboard/profiles/process-profiles?toast=updated`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Edit Process Profile</h2>
      {errorMsg && (
        <div className="rounded bg-rose-50 p-4 text-rose-800 ">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Process selector – same as create */}
        <div>
          <label className="block text-sm font-medium mb-1">Main Process</label>
          <SearchableSelect
            name="mainProcessId"
            value={formData.mainProcessId}
            onChange={handleChange}
            required
            className="w-full rounded border p-2"
          >
            {/* TODO: populate options – for simplicity we reuse the create page fetch */}
          </SearchableSelect>
        </div>
        {/* Flags */}
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input type="checkbox" name="welding" checked={formData.welding} onChange={handleChange} className="mr-2" />
            Welding
          </label>
          <label className="inline-flex items-center">
            <input type="checkbox" name="sprayPainting" checked={formData.sprayPainting} onChange={handleChange} className="mr-2" />
            Spray Painting
          </label>
          <label className="inline-flex items-center">
            <input type="checkbox" name="machining" checked={formData.machining} onChange={handleChange} className="mr-2" />
            Machining
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cost Per Minute (INR)</label>
          <input
            type="number"
            step="0.01"
            name="costPerMinute"
            value={formData.costPerMinute}
            onChange={handleChange}
            required
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <textarea
            name="remark"
            rows={3}
            value={formData.remark}
            onChange={handleChange}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <SearchableSelect name="status" value={formData.status} onChange={handleChange} className="w-full rounded border p-2">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SearchableSelect>
        </div>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>
          Save Changes
        </button>
      </form>
    </div>
  );
}
