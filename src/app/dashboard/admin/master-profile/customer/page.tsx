"use client";
import { customConfirm } from "@/lib/customConfirm";
import { toast as hotToast } from "react-hot-toast";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCustomerProfiles,
  getCustomerDetail,
  createCustomerProfile,
  updateCustomerInfo,
  toggleCustomerStatus,
  deleteCustomerProfile,
  addContactPerson,
  updateContactPerson,
  toggleContactPersonStatus,
  setContactPersonDefault,
  deleteContactPerson,
  addAddress,
  updateAddress,
  toggleAddressStatus,
  setAddressDefault,
  deleteAddress,
  getCustomerCodePreview,
} from "./actions";

interface CustomerSummary {
  id: string;
  customerCode: string;
  customerName: string;
  remarks: string | null;
  gstin?: string | null;
  status: string;
  isSez: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    contactPersons: number;
    addresses: number;
  };
}

interface ContactPerson {
  id: string;
  customerId: string;
  contactPersonName: string;
  telNo: string | null;
  mobileNo: string | null;
  faxNo: string | null;
  email: string | null;
  designation: string | null;
  status: string;
  isDefault: boolean;
}

interface CustomerAddress {
  id: string;
  customerId: string;
  address: string;
  status: string;
  isDefault: boolean;
}

interface CustomerFullDetail {
  id: string;
  customerCode: string;
  customerName: string;
  remarks: string | null;
  gstin?: string | null;
  status: string;
  isSez: boolean;
  contactPersons: ContactPerson[];
  addresses: CustomerAddress[];
}

export default function CustomerProfilePage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerFullDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"general" | "contacts" | "addresses">("general");

  // Create Customer Form States
  const [newName, setNewName] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newRoNumber, setNewRoNumber] = useState("");
  const [newPan, setNewPan] = useState("");
  const [newPlaceOfSupply, setNewPlaceOfSupply] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [newIsSez, setNewIsSez] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("Auto-generated");

  // Manage Customer General Info Form States
  const [remarksEdit, setRemarksEdit] = useState("");
  const [gstinEdit, setGstinEdit] = useState("");
  const [roNumberEdit, setRoNumberEdit] = useState("");
  const [panEdit, setPanEdit] = useState("");
  const [placeOfSupplyEdit, setPlaceOfSupplyEdit] = useState("");
  const [isSezEdit, setIsSezEdit] = useState(false);
  const [remarksSuccess, setRemarksSuccess] = useState(false);

  // Manage Contacts Sub-states
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactEditId, setContactEditId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [contactFax, setContactFax] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [contactIsDefault, setContactIsDefault] = useState(false);
  const [contactFormError, setContactFormError] = useState<string | null>(null);

  // Manage Addresses Sub-states
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addressEditId, setAddressEditId] = useState<string | null>(null);
  const [addressText, setAddressText] = useState("");
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadCustomers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const result = await getCustomerProfiles();
    if (result.success && result.data) {
      setCustomers(result.data as CustomerSummary[]);
    } else {
      setErrorMsg(result.error || "Failed to load customer profiles.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      loadCustomers();
    });
  }, []);

  const loadCustomerDetailData = async (id: string) => {
    const res = await getCustomerDetail(id);
    if (res.success && res.data) {
      setCustomerDetail(res.data as CustomerFullDetail);
      setRemarksEdit(res.data.remarks || "");
      setGstinEdit((res.data as any).gstin || "");
      setRoNumberEdit((res.data as any).roNumber || "");
      setPanEdit((res.data as any).pan || "");
      setPlaceOfSupplyEdit((res.data as any).placeOfSupply || "");
      setIsSezEdit((res.data as any).isSez || false);
    } else {
      hotToast.error(res.error || "Failed to load customer details.");
    }
  };

  const handleOpenCreateModal = async () => {
    setNewName("");
    setNewGstin("");
    setNewRoNumber("");
    setNewPan("");
    setNewPlaceOfSupply("");
    setNewRemarks("");
    setNewIsSez(false);
    setFormError(null);
    setPreviewCode("Loading...");
    setIsCreateModalOpen(true);
    
    const code = await getCustomerCodePreview();
    setPreviewCode(code || "Auto-generated");
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = newName.trim();
    const gstin = newGstin.trim();

    if (!name) {
      setFormError("Customer Name is required.");
      return;
    }
    if (!gstin) {
      setFormError("GSTIN is required.");
      return;
    }

    startTransition(async () => {
      const res = await createCustomerProfile({
        customerName: name,
        remarks: newRemarks,
        gstin: newGstin,
        isSez: newIsSez,
        roNumber: newRoNumber,
        pan: newPan,
        placeOfSupply: newPlaceOfSupply,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        loadCustomers();
      } else {
        setFormError(res.error || "Failed to create customer.");
      }
    });
  };

  const handleOpenManageModal = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailTab("general");
    setIsContactFormOpen(false);
    setIsAddressFormOpen(false);
    setRemarksSuccess(false);
    setIsManageModalOpen(true);
    await loadCustomerDetailData(id);
  };

  const handleSaveInfo = async () => {
    if (!selectedCustomerId) return;
    setRemarksSuccess(false);

    if (!gstinEdit.trim()) {
      hotToast.error("GSTIN is required.");
      return;
    }

    startTransition(async () => {
      const res = await updateCustomerInfo(selectedCustomerId, {
        remarks: remarksEdit,
        gstin: gstinEdit,
        isSez: isSezEdit,
        roNumber: roNumberEdit,
        pan: panEdit,
        placeOfSupply: placeOfSupplyEdit,
      });
      if (res.success) {
        setRemarksSuccess(true);
        loadCustomers();
      } else {
        hotToast.error(res.error || "Failed to update info.");
      }
    });
  };

  const handleToggleCustomerStatus = async (id: string) => {
    startTransition(async () => {
      const res = await toggleCustomerStatus(id);
      if (res.success) {
        loadCustomers();
      } else {
        hotToast.error(res.error || "Failed to change status.");
      }
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    if (await customConfirm("Void this customer profile? Voided records are retained for audit and cannot be restored.")) {
      startTransition(async () => {
        const res = await deleteCustomerProfile(id);
        if (res.success) {
          loadCustomers();
        } else {
          hotToast.error(res.error || "Failed to void customer.");
        }
      });
    }
  };

  // ==========================================
  // CONTACT PERSON SUB-HANDLERS
  // ==========================================
  const handleOpenAddContact = () => {
    setContactEditId(null);
    setContactName("");
    setContactTel("");
    setContactMobile("");
    setContactFax("");
    setContactEmail("");
    setContactDesignation("");
    setContactIsDefault(false);
    setContactFormError(null);
    setIsContactFormOpen(true);
  };

  const handleOpenEditContact = (c: ContactPerson) => {
    setContactEditId(c.id);
    setContactName(c.contactPersonName);
    setContactTel(c.telNo || "");
    setContactMobile(c.mobileNo || "");
    setContactFax(c.faxNo || "");
    setContactEmail(c.email || "");
    setContactDesignation(c.designation || "");
    setContactIsDefault(c.isDefault);
    setContactFormError(null);
    setIsContactFormOpen(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setContactFormError(null);

    const name = contactName.trim();
    if (!name) {
      setContactFormError("Contact Person name is required.");
      return;
    }

    startTransition(async () => {
      let res;
      if (contactEditId) {
        res = await updateContactPerson(contactEditId, {
          contactPersonName: name,
          telNo: contactTel,
          mobileNo: contactMobile,
          faxNo: contactFax,
          email: contactEmail,
          designation: contactDesignation,
        });
      } else {
        res = await addContactPerson(selectedCustomerId, {
          contactPersonName: name,
          telNo: contactTel,
          mobileNo: contactMobile,
          faxNo: contactFax,
          email: contactEmail,
          designation: contactDesignation,
          isDefault: contactIsDefault,
        });
      }

      if (res.success) {
        setIsContactFormOpen(false);
        loadCustomerDetailData(selectedCustomerId);
        loadCustomers();
      } else {
        setContactFormError(res.error || "Failed to save contact person.");
      }
    });
  };

  const handleToggleContactStatus = async (id: string) => {
    if (!selectedCustomerId) return;
    startTransition(async () => {
      const res = await toggleContactPersonStatus(id);
      if (res.success) {
        loadCustomerDetailData(selectedCustomerId);
      } else {
        hotToast.error(res.error || "Failed to toggle contact status.");
      }
    });
  };

  const handleSetContactDefault = async (id: string) => {
    if (!selectedCustomerId) return;
    startTransition(async () => {
      const res = await setContactPersonDefault(id, selectedCustomerId);
      if (res.success) {
        loadCustomerDetailData(selectedCustomerId);
      } else {
        hotToast.error(res.error || "Failed to set default contact.");
      }
    });
  };

  const handleDeleteContact = async (id: string) => {
    if (!selectedCustomerId) return;
    if (await customConfirm("Void this contact person? Voided records are retained for audit.")) {
      startTransition(async () => {
        const res = await deleteContactPerson(id);
        if (res.success) {
          loadCustomerDetailData(selectedCustomerId);
          loadCustomers();
        } else {
          hotToast.error(res.error || "Failed to delete contact.");
        }
      });
    }
  };

  // ==========================================
  // ADDRESS SUB-HANDLERS
  // ==========================================
  const handleOpenAddAddress = () => {
    setAddressEditId(null);
    setAddressText("");
    setAddressIsDefault(false);
    setAddressFormError(null);
    setIsAddressFormOpen(true);
  };

  const handleOpenEditAddress = (a: CustomerAddress) => {
    setAddressEditId(a.id);
    setAddressText(a.address);
    setAddressIsDefault(a.isDefault);
    setAddressFormError(null);
    setIsAddressFormOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setAddressFormError(null);

    const txt = addressText.trim();
    if (!txt) {
      setAddressFormError("Address is required.");
      return;
    }

    startTransition(async () => {
      let res;
      if (addressEditId) {
        res = await updateAddress(addressEditId, txt);
      } else {
        res = await addAddress(selectedCustomerId, {
          address: txt,
          isDefault: addressIsDefault,
        });
      }

      if (res.success) {
        setIsAddressFormOpen(false);
        loadCustomerDetailData(selectedCustomerId);
        loadCustomers();
      } else {
        setAddressFormError(res.error || "Failed to save address.");
      }
    });
  };

  const handleToggleAddressStatus = async (id: string) => {
    if (!selectedCustomerId) return;
    startTransition(async () => {
      const res = await toggleAddressStatus(id);
      if (res.success) {
        loadCustomerDetailData(selectedCustomerId);
      } else {
        hotToast.error(res.error || "Failed to toggle address status.");
      }
    });
  };

  const handleSetAddressDefault = async (id: string) => {
    if (!selectedCustomerId) return;
    startTransition(async () => {
      const res = await setAddressDefault(id, selectedCustomerId);
      if (res.success) {
        loadCustomerDetailData(selectedCustomerId);
      } else {
        hotToast.error(res.error || "Failed to set default address.");
      }
    });
  };

  const handleDeleteAddress = async (id: string) => {
    if (!selectedCustomerId) return;
    if (await customConfirm("Void this address? Voided records are retained for audit.")) {
      startTransition(async () => {
        const res = await deleteAddress(id);
        if (res.success) {
          loadCustomerDetailData(selectedCustomerId);
          loadCustomers();
        } else {
          hotToast.error(res.error || "Failed to delete address.");
        }
      });
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (c) =>
      c.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-white text-black p-6 md:p-8 rounded-2xl shadow-sm border border-blue-100">
      {/* Top Banner/Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Customer Profile
          </h1>
          <p className="text-sm text-blue-650">
            Maintain the master list of customers along with their multiple contact persons and addresses.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-lg glossy-button-blue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search Panel */}
      <div className="rounded-xl glossy-bg p-4 bg-white">
        <div className="relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg glossy-input py-2 pl-10 pr-4 text-sm outline-hidden placeholder:text-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Customer List Table */}
      <div className="overflow-hidden rounded-xl glossy-bg bg-white">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : errorMsg ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 p-6 text-center">
            <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="font-semibold text-black">Error loading customers</p>
            <p className="text-sm text-blue-600">{errorMsg}</p>
            <button onClick={loadCustomers} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
              Try again
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <svg className="h-12 w-12 text-blue-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-2 font-semibold text-black">No customers found</p>
            <p className="text-sm text-blue-600">
              {searchQuery ? "No matches for your criteria." : "Create your first Customer Profile to begin."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">
                  <th className="px-6 py-4.5 w-16">SN</th>
                  <th className="px-6 py-4.5">Customer Code</th>
                  <th className="px-6 py-4.5">Customer Name</th>
                  <th className="px-6 py-4.5 text-center">Contacts</th>
                  <th className="px-6 py-4.5 text-center">Addresses</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="group hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-blue-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-black">
                      {customer.customerCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-800 font-medium">
                      {customer.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-blue-800">
                      {customer._count.contactPersons}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-blue-800">
                      {customer._count.addresses}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          customer.status === "Active"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${customer.status === "Active" ? "bg-blue-600" : "bg-blue-400"}`} />
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenManageModal(customer.id)}
                          className="rounded-md glossy-button-blue px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handleToggleCustomerStatus(customer.id)}
                          disabled={isPending}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                            customer.status === "Active"
                              ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                              : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                          }`}
                        >
                          {customer.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          disabled={isPending}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          Void
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

      {/* 1. Create Customer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-blue-950/30 backdrop-blur-xs" onClick={() => setIsCreateModalOpen(false)} />

          <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-xl border border-blue-200 transition-all flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-blue-200 p-6 shrink-0">
              <h2 className="text-xl font-bold text-black">
                Create Customer Profile
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
                    <div className="flex gap-2.5">
                      <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{formError}</span>
                    </div>
                  </div>
                )}

                {/* Customer Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    Customer Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={previewCode}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Customer Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                  />
                  <p className="text-xs text-blue-500">
                    Once saved, Customer Name cannot be changed. Must be unique.
                  </p>
                </div>

                {/* GSTIN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    GSTIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                  />
                </div>

                {/* RO Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    RO Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter RO Number..."
                    value={newRoNumber}
                    onChange={(e) => setNewRoNumber(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                  />
                </div>

                {/* PAN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    PAN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                  />
                </div>

                {/* Place of Supply */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu (33)"
                    value={newPlaceOfSupply}
                    onChange={(e) => setNewPlaceOfSupply(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                  />
                </div>

                {/* Remarks */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-blue-800">
                    Remarks
                  </label>
                  <textarea
                    placeholder="Enter remarks..."
                    rows={3}
                    value={newRemarks}
                    onChange={(e) => setNewRemarks(e.target.value)}
                    className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden resize-none"
                  />
                </div>

                {/* Is SEZ */}
                <label className="flex items-center gap-2 cursor-pointer mt-2 w-fit">
                  <input
                    type="checkbox"
                    checked={newIsSez}
                    onChange={(e) => setNewIsSez(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-blue-800">
                    Is Social Economic Zone (SEZ)
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-blue-200 p-6 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg glossy-button-white px-5 py-2.5 text-base font-bold text-blue-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-lg glossy-button-blue px-5 py-2.5 text-base font-bold text-white shadow-md disabled:opacity-70 cursor-pointer"
                >
                  {isPending ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manage Details Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="fixed inset-0 bg-blue-950/30 backdrop-blur-xs" onClick={() => setIsManageModalOpen(false)} />

          <div className="relative w-full max-w-4xl transform overflow-hidden rounded-xl bg-white p-6 shadow-xl border border-blue-200 transition-all flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-blue-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-black flex items-center gap-2">
                  <span>Manage Customer Profile</span>
                  {customerDetail && (
                    <span className="text-sm bg-blue-150 px-2.5 py-1 rounded-md border border-blue-200 text-blue-650 font-semibold">
                      {customerDetail.customerCode}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-blue-500 mt-0.5">
                  {customerDetail?.customerName}
                </p>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-blue-200 mt-4 justify-center">
              {[
                { id: "general", label: "General Info" },
                { id: "contacts", label: `Contact Persons (${customerDetail?.contactPersons.length || 0})` },
                { id: "addresses", label: `Addresses (${customerDetail?.addresses.length || 0})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setDetailTab(t.id as "general" | "contacts" | "addresses");
                    setIsContactFormOpen(false);
                    setIsAddressFormOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    detailTab === t.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-blue-550 hover:text-blue-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents - Scrollable */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 min-h-[40vh]">
              {!customerDetail ? (
                <div className="flex h-36 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              ) : (
                <>
                  {/* TAB 1: GENERAL INFO */}
                  {detailTab === "general" && (
                    <div className="space-y-4 max-w-xl">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-blue-500 uppercase">Customer Code</span>
                          <span className="text-base font-bold text-black bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                            {customerDetail.customerCode}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-blue-500 uppercase">Customer Name</span>
                          <span className="text-base font-bold text-black bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                            {customerDetail.customerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-blue-800">
                          GSTIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter GSTIN..."
                          value={gstinEdit}
                          onChange={(e) => setGstinEdit(e.target.value)}
                          className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                        />
                      </div>

                      {/* RO Number */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-blue-800">
                          RO Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter RO Number..."
                          value={roNumberEdit}
                          onChange={(e) => setRoNumberEdit(e.target.value)}
                          className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                        />
                      </div>

                      {/* PAN */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-blue-800">
                          PAN
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ABCDE1234F"
                          value={panEdit}
                          onChange={(e) => setPanEdit(e.target.value)}
                          className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                        />
                      </div>

                      {/* Place of Supply */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-blue-800">
                          Place of Supply
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tamil Nadu (33)"
                          value={placeOfSupplyEdit}
                          onChange={(e) => setPlaceOfSupplyEdit(e.target.value)}
                          className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-base font-bold text-blue-800">
                          Remarks
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Enter remarks..."
                          value={remarksEdit}
                          onChange={(e) => setRemarksEdit(e.target.value)}
                          className="rounded-lg glossy-input px-3 py-2 text-base outline-hidden resize-none"
                        />
                      </div>

                      {/* Is SEZ */}
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          checked={isSezEdit}
                          onChange={(e) => setIsSezEdit(e.target.checked)}
                          className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-blue-800">
                          Is Social Economic Zone (SEZ)
                        </span>
                      </label>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleSaveInfo}
                          disabled={isPending}
                          className="rounded-lg glossy-button-blue px-5 py-2.5 text-base font-bold text-white shadow-md cursor-pointer"
                        >
                          Save Changes
                        </button>

                        {remarksSuccess && (
                          <span className="text-sm text-green-600 font-semibold flex items-center gap-1 animate-pulse">
                            ✓ Saved successfully
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CONTACT PERSONS */}
                  {detailTab === "contacts" && (
                    <div className="space-y-4">
                      {/* Sub Form Header */}
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-black">Contact Persons list</h3>
                        {!isContactFormOpen && (
                          <button
                            onClick={handleOpenAddContact}
                            className="rounded-lg glossy-button-blue px-4 py-2 text-sm font-bold text-white shadow-sm cursor-pointer"
                          >
                            Add Contact Person
                          </button>
                        )}
                      </div>

                      {/* Contact Form Section */}
                      {isContactFormOpen && (
                        <form onSubmit={handleContactSubmit} className="border border-blue-200 bg-blue-50/20 p-4 rounded-xl space-y-4 animate-fadeIn">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-700">
                            {contactEditId ? "Edit Contact Details" : "Add New Contact"}
                          </h4>

                          {contactFormError && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-sm text-red-800">
                              {contactFormError}
                            </div>
                          )}

                          {/* Row 1: Contact Person, Tel No, Mobile No — spec order */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Contact Person <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                required
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Tel No</label>
                              <input
                                type="text"
                                value={contactTel}
                                onChange={(e) => setContactTel(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Mobile No</label>
                              <input
                                type="text"
                                value={contactMobile}
                                onChange={(e) => setContactMobile(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          {/* Row 2: Fax No, Email, Designation — spec order */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Fax No</label>
                              <input
                                type="text"
                                value={contactFax}
                                onChange={(e) => setContactFax(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Email</label>
                              <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-blue-700">Designation</label>
                              <input
                                type="text"
                                value={contactDesignation}
                                onChange={(e) => setContactDesignation(e.target.value)}
                                className="rounded-lg glossy-input px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          {!contactEditId && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="contactDefault"
                                checked={contactIsDefault}
                                onChange={(e) => setContactIsDefault(e.target.checked)}
                                className="h-4.5 w-4.5 rounded-sm border-blue-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="contactDefault" className="text-sm font-semibold text-blue-800">
                                Set as Default Contact Person
                              </label>
                            </div>
                          )}

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setIsContactFormOpen(false)}
                              className="rounded-lg glossy-button-white px-4 py-2 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-lg glossy-button-blue px-4 py-2 text-sm text-white"
                            >
                              Save Contact
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Contact Persons Table */}
                      {customerDetail.contactPersons.length === 0 ? (
                        <div className="text-center py-6 text-xs text-blue-500 border border-dashed border-blue-200 rounded-lg">
                          No contact persons added yet. Click &quot;Add Contact Person&quot; above.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-blue-200 rounded-lg">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-blue-200 bg-blue-50 font-bold text-blue-700">
                                <th className="px-4 py-3">Contact Person</th>
                                <th className="px-4 py-3">Tel No</th>
                                <th className="px-4 py-3">Mobile No</th>
                                <th className="px-4 py-3">Fax No</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Designation</th>
                                <th className="px-4 py-3 text-center">Default</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-150">
                              {customerDetail.contactPersons.map((contact) => (
                                <tr key={contact.id} className="hover:bg-blue-50">
                                  <td className="px-4 py-3 font-bold text-black">{contact.contactPersonName}</td>
                                  <td className="px-4 py-3 text-blue-800">{contact.telNo || "—"}</td>
                                  <td className="px-4 py-3 text-blue-800">{contact.mobileNo || "—"}</td>
                                  <td className="px-4 py-3 text-blue-800">{contact.faxNo || "—"}</td>
                                  <td className="px-4 py-3 text-blue-800">{contact.email || "—"}</td>
                                  <td className="px-4 py-3 text-blue-800">{contact.designation || "—"}</td>
                                  <td className="px-4 py-3 text-center">
                                    {contact.isDefault ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                        Default
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleSetContactDefault(contact.id)}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
                                      >
                                        Set Default
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                        contact.status === "Active"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-blue-50 text-blue-600 border-blue-200"
                                      }`}
                                    >
                                      {contact.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditContact(contact)}
                                        className="rounded-md glossy-button-white px-2 py-1 text-[10px] cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleToggleContactStatus(contact.id)}
                                        className={`rounded-md px-2 py-1 text-[10px] font-bold border cursor-pointer ${
                                          contact.status === "Active"
                                            ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                            : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                        }`}
                                      >
                                        {contact.status === "Active" ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                                      >
                                        Void
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
                  )}

                  {/* TAB 3: ADDRESSES */}
                  {detailTab === "addresses" && (
                    <div className="space-y-4">
                      {/* Sub Form Header */}
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-black">Addresses list</h3>
                        {!isAddressFormOpen && (
                          <button
                            onClick={handleOpenAddAddress}
                            className="rounded-lg glossy-button-blue px-4 py-2 text-sm font-bold text-white shadow-sm cursor-pointer"
                          >
                            Add Address
                          </button>
                        )}
                      </div>

                      {/* Address Form Section */}
                      {isAddressFormOpen && (
                        <form onSubmit={handleAddressSubmit} className="border border-blue-200 bg-blue-50/20 p-4 rounded-xl space-y-4 animate-fadeIn">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-blue-700">
                            {addressEditId ? "Edit Address Details" : "Add New Address"}
                          </h4>

                          {addressFormError && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-sm text-red-800">
                              {addressFormError}
                            </div>
                          )}

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-blue-700">Street Address <span className="text-red-500">*</span></label>
                            <textarea
                              required
                              rows={3}
                              value={addressText}
                              onChange={(e) => setAddressText(e.target.value)}
                              placeholder="e.g. 10 Anson Road, #25-01 International Plaza, Singapore 079903"
                              className="rounded-lg glossy-input px-3 py-2 text-sm resize-none"
                            />
                          </div>

                          {!addressEditId && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="addressDefault"
                                checked={addressIsDefault}
                                onChange={(e) => setAddressIsDefault(e.target.checked)}
                                className="h-4.5 w-4.5 rounded-sm border-blue-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="addressDefault" className="text-sm font-semibold text-blue-800">
                                Set as Default Address
                              </label>
                            </div>
                          )}

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setIsAddressFormOpen(false)}
                              className="rounded-lg glossy-button-white px-4 py-2 text-sm cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-lg glossy-button-blue px-4 py-2 text-sm text-white cursor-pointer"
                            >
                              Save Address
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Addresses Table */}
                      {customerDetail.addresses.length === 0 ? (
                        <div className="text-center py-6 text-xs text-blue-500 border border-dashed border-blue-200 rounded-lg">
                          No addresses added yet. Click &quot;Add Address&quot; above.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-blue-200 rounded-lg">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-blue-200 bg-blue-50 font-bold text-blue-700">
                                <th className="px-4 py-3">Address</th>
                                <th className="px-4 py-3 text-center">Default</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-150">
                              {customerDetail.addresses.map((addr) => (
                                <tr key={addr.id} className="hover:bg-blue-50">
                                  <td className="px-4 py-3 text-blue-800 whitespace-pre-line font-medium leading-relaxed">
                                    {addr.address}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {addr.isDefault ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                        Default
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleSetAddressDefault(addr.id)}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
                                      >
                                        Set Default
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                        addr.status === "Active"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-blue-50 text-blue-600 border-blue-200"
                                      }`}
                                    >
                                      {addr.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditAddress(addr)}
                                        className="rounded-md glossy-button-white px-2 py-1 text-[10px] cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleToggleAddressStatus(addr.id)}
                                        className={`rounded-md px-2 py-1 text-[10px] font-bold border cursor-pointer ${
                                          addr.status === "Active"
                                            ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                                            : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                        }`}
                                      >
                                        {addr.status === "Active" ? "Deactivate" : "Activate"}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAddress(addr.id)}
                                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                                      >
                                        Void
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
                  )}
                </>
              )}
            </div>

            {/* Footer Close Button */}
            <div className="flex items-center justify-end border-t border-blue-200 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="rounded-lg glossy-button-white px-4 py-2 text-sm"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
