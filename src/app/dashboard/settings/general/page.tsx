"use client";

import React, { useState, useEffect } from "react";
import { getGeneralSetting, updateGeneralSetting } from "./actions";
import hotToast from "react-hot-toast";

export default function GeneralSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [enableSignature, setEnableSignature] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState("");
  const [enableInvoiceBackground, setEnableInvoiceBackground] = useState(false);
  const [invoiceBackgroundUrl, setInvoiceBackgroundUrl] = useState("");
  const [enableInvoiceFooter, setEnableInvoiceFooter] = useState(false);
  const [invoiceFooterUrl, setInvoiceFooterUrl] = useState("");

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    loadSetting();
  }, []);

  const loadSetting = async () => {
    setLoading(true);
    const res = await getGeneralSetting();
    if (res.success && res.data) {
      setLogoUrl(res.data.logoUrl || "");
      setEnableSignature(res.data.enableSignature || false);
      setSignatureUrl(res.data.signatureUrl || "");
      setEnableInvoiceBackground(res.data.enableInvoiceBackground || false);
      setInvoiceBackgroundUrl(res.data.invoiceBackgroundUrl || "");
      setEnableInvoiceFooter(res.data.enableInvoiceFooter || false);
      setInvoiceFooterUrl(res.data.invoiceFooterUrl || "");
    } else {
      hotToast.error(res.error || "Failed to load settings.");
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Upload failed");

      if (field === "logo") setLogoUrl(json.url);
      else if (field === "signature") setSignatureUrl(json.url);
      else if (field === "background") setInvoiceBackgroundUrl(json.url);
      else if (field === "footer") setInvoiceFooterUrl(json.url);
      
    } catch (err: any) {
      hotToast.error(err.message || "Upload failed.");
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const handleRemove = (field: string) => {
    if (field === "logo") setLogoUrl("");
    else if (field === "signature") setSignatureUrl("");
    else if (field === "background") setInvoiceBackgroundUrl("");
    else if (field === "footer") setInvoiceFooterUrl("");
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      logoUrl,
      enableSignature,
      signatureUrl,
      enableInvoiceBackground,
      invoiceBackgroundUrl,
      enableInvoiceFooter,
      invoiceFooterUrl,
    };
    const res = await updateGeneralSetting(payload);
    if (res.success) {
      hotToast.success("Settings saved successfully.");
    } else {
      hotToast.error(res.error || "Failed to save settings.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const ImageUploader = ({
    label,
    url,
    field,
    maxSize
  }: {
    label: string,
    url: string,
    field: string,
    maxSize: string
  }) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <div className="flex items-start gap-4">
        <label className={`flex flex-col items-center justify-center w-36 h-32 border border-gray-200 rounded cursor-pointer transition-colors ${uploadingField === field ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}>
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <svg className="w-5 h-5 mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p className="text-[10px] text-gray-500 mb-1">Click To Upload</p>
            <p className="text-[9px] text-gray-400">(Max Size {maxSize})</p>
            <p className="text-[9px] text-gray-400">jpg, jpeg, png</p>
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={(e) => handleUpload(e, field)}
            disabled={uploadingField === field}
          />
        </label>
        
        {url && (
          <div className="relative w-36 h-32 border border-emerald-300 rounded p-1 flex items-center justify-center bg-white">
            <img 
              src={url.startsWith("/uploads") ? `/api${url}` : url} 
              alt={label} 
              className="max-w-full max-h-full object-contain"
            />
            <button 
              onClick={() => handleRemove(field)}
              className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 hover:bg-emerald-600 transition-colors"
              title="Remove image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-6">General Options</h2>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="inline-block border border-gray-200 rounded px-4 py-2 text-xs font-semibold text-gray-600">
              Logo and Signature Setting
            </div>
          </div>

          <div className="p-6 space-y-6">
            <ImageUploader 
              label="Logo" 
              url={logoUrl} 
              field="logo" 
              maxSize="400 x 200" 
            />

            <div className="flex items-center gap-2">
              <div 
                className={`w-4 h-4 rounded-sm flex items-center justify-center cursor-pointer ${enableSignature ? 'bg-emerald-500' : 'border border-gray-300'}`}
                onClick={() => setEnableSignature(!enableSignature)}
              >
                {enableSignature && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <label className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => setEnableSignature(!enableSignature)}>
                Enable Digital Signature
              </label>
            </div>

            <ImageUploader 
              label="Signature image" 
              url={signatureUrl} 
              field="signature" 
              maxSize="500 x 150" 
            />

            <div className="flex items-center gap-2">
              <div 
                className={`w-4 h-4 rounded-sm flex items-center justify-center cursor-pointer ${enableInvoiceBackground ? 'bg-emerald-500' : 'border border-gray-300'}`}
                onClick={() => setEnableInvoiceBackground(!enableInvoiceBackground)}
              >
                {enableInvoiceBackground && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <label className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => setEnableInvoiceBackground(!enableInvoiceBackground)}>
                Enable Invoice Background Image
              </label>
            </div>

            <ImageUploader 
              label="Invoice background image" 
              url={invoiceBackgroundUrl} 
              field="background" 
              maxSize="1400 x 1400" 
            />

            <div className="flex items-center gap-2">
              <div 
                className={`w-4 h-4 rounded-sm flex items-center justify-center cursor-pointer ${enableInvoiceFooter ? 'bg-emerald-500' : 'border border-gray-300'}`}
                onClick={() => setEnableInvoiceFooter(!enableInvoiceFooter)}
              >
                {enableInvoiceFooter && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <label className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => setEnableInvoiceFooter(!enableInvoiceFooter)}>
                Enable Invoice Footer Image
              </label>
            </div>

            <ImageUploader 
              label="Invoice footer Image" 
              url={invoiceFooterUrl} 
              field="footer" 
              maxSize="1400 x 200" 
            />
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-center pb-8">
            <button
              onClick={handleSave}
              disabled={saving || !!uploadingField}
              className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2 rounded font-semibold text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z" />
                </svg>
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
