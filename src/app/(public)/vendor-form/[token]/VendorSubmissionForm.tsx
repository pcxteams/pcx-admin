'use client';

import { useState, useRef, useCallback } from 'react';
import { Building2, CheckCircle, Upload, Loader2, X } from 'lucide-react';

interface Prefill {
  vendorId: string;
  companyName: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  expiresAt: string;
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
const INPUT_ERROR = 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const MAX_DESCRIPTION_LENGTH = 325;

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return /\.[a-zA-Z]{2,}$/.test(u.hostname);
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-semibold shrink-0">
        {n}
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

/** Shared drag-and-drop image upload used for both Company Logo and Contact Headshot. */
function ImageUploadField({
  label,
  token,
  field,
  onUploaded,
  error: externalError,
}: {
  label: string;
  token: string;
  field: 'logo' | 'headshot';
  onUploaded: (publicUrl: string | null) => void;
  error?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(async (selected: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      setError('Only PNG, JPG, GIF, or WebP files are allowed.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('File must be under 5 MB.');
      return;
    }
    setFile(selected);
    setError(null);
    setUploaded(false);
    onUploaded(null);
    setPreview(URL.createObjectURL(selected));
    setUploading(true);
    try {
      const res = await fetch(`/api/vendor-form/${token}/${field}-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: selected.type, fileSizeBytes: selected.size }),
      });
      if (!res.ok) throw new Error('Could not get upload URL.');
      const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string };
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selected.type },
        body: selected,
      });
      if (!s3Res.ok) throw new Error('Upload failed.');
      setUploaded(true);
      onUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setPreview(null);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, [token, field, onUploaded]);

  return (
    <div>
      <label className={LABEL}>
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSelect(f); }}
      />
      {preview ? (
        <div className="relative flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`${label} preview`} className="h-12 w-12 object-cover rounded" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">{file?.name}</p>
            {uploading ? (
              <p className="flex items-center gap-1.5 text-xs text-teal-600 mt-0.5">
                <Loader2 size={11} className="animate-spin" /> Uploading…
              </p>
            ) : uploaded ? (
              <p className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                <CheckCircle size={11} /> Uploaded
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => { setFile(null); setPreview(null); setUploaded(false); setError(null); onUploaded(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-6 py-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleSelect(f); }}
        >
          <Upload size={22} className="text-gray-300" />
          <p className="text-sm text-gray-500">Browse Files or drag and drop</p>
          <p className="text-xs text-gray-400">PNG, JPG, GIF, WebP · Max 5 MB</p>
        </div>
      )}
      {(error || externalError) && <p className="mt-1 text-xs text-red-500">{error || externalError}</p>}
    </div>
  );
}

export default function VendorSubmissionForm({ prefill, token }: { prefill: Prefill; token: string }) {
  const [companyName, setCompanyName] = useState(prefill.companyName);
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function inputClass(key: string) {
    return fieldErrors[key] ? INPUT_ERROR : INPUT;
  }

  async function handleSubmit() {
    setSubmitError(null);

    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = 'Company Name is required.';
    if (!companyWebsite.trim()) errors.companyWebsite = 'Company Website is required.';
    else if (!isValidUrl(companyWebsite)) errors.companyWebsite = 'Must be a valid URL (e.g. https://example.com).';
    if (!description.trim()) errors.description = 'Description of Services is required.';
    else if (description.trim().length > MAX_DESCRIPTION_LENGTH) errors.description = `Must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
    if (!logoUrl) errors.logo = 'Company Logo is required.';
    if (!contactFirstName.trim()) errors.contactFirstName = 'First Name is required.';
    if (!contactLastName.trim()) errors.contactLastName = 'Last Name is required.';
    if (!contactTitle.trim()) errors.contactTitle = 'Contact Title is required.';
    if (!contactEmail.trim()) errors.contactEmail = 'Contact Email Address is required.';
    else if (!isValidEmail(contactEmail)) errors.contactEmail = 'Must be a valid email address.';
    if (!contactPhone.trim()) errors.contactPhone = 'Contact Phone Number is required.';
    if (!headshotUrl) errors.headshot = 'Contact Headshot is required.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError('Please correct the highlighted fields below.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vendor-form/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyWebsite: companyWebsite.trim(),
          description: description.trim(),
          logoUrl,
          contactFirstName: contactFirstName.trim(),
          contactLastName: contactLastName.trim(),
          contactTitle: contactTitle.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          headshotUrl,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setSubmitError(body.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full px-8 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-teal-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">You&apos;re All Set!</h1>
          <p className="text-sm text-gray-500">
            Thanks — your Preferred Vendor submission for {prefill.workspaceName} has been received.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header — clearly identifies the Office Workspace sending the invitation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900">Preferred Vendor Submission Form</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 size={11} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400 truncate">{prefill.workspaceName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={1} title="Company Information" />
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Company Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className={inputClass('companyName')}
              />
              {fieldErrors.companyName && <p className="mt-1 text-xs text-red-500">{fieldErrors.companyName}</p>}
            </div>
            <div>
              <label className={LABEL}>Company Website <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://example.com"
                className={inputClass('companyWebsite')}
              />
              {fieldErrors.companyWebsite && <p className="mt-1 text-xs text-red-500">{fieldErrors.companyWebsite}</p>}
            </div>
            <div>
              <label className={LABEL}>Description of Services <span className="text-red-500">*</span></label>
              <p className="mb-1 text-xs text-gray-400">
                Three to four sentences highlighting your business, so agents understand why they should want to work with you.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`${inputClass('description')} resize-y`}
              />
              <div className="flex items-center justify-between mt-1">
                {fieldErrors.description ? (
                  <p className="text-xs text-red-500">{fieldErrors.description}</p>
                ) : <span />}
                <p className="text-xs text-gray-400 shrink-0">{description.length}/{MAX_DESCRIPTION_LENGTH}</p>
              </div>
            </div>
            <ImageUploadField label="Company Logo" token={token} field="logo" onUploaded={setLogoUrl} error={fieldErrors.logo} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader n={2} title="Contact Information" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  className={inputClass('contactFirstName')}
                />
                {fieldErrors.contactFirstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactFirstName}</p>}
              </div>
              <div>
                <label className={LABEL}>Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={contactLastName}
                  onChange={(e) => setContactLastName(e.target.value)}
                  className={inputClass('contactLastName')}
                />
                {fieldErrors.contactLastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactLastName}</p>}
              </div>
            </div>
            <div>
              <label className={LABEL}>Contact Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                placeholder="e.g. Account Executive"
                className={inputClass('contactTitle')}
              />
              {fieldErrors.contactTitle && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactTitle}</p>}
            </div>
            <div>
              <label className={LABEL}>Contact Email Address <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
                className={inputClass('contactEmail')}
              />
              {fieldErrors.contactEmail && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactEmail}</p>}
            </div>
            <div>
              <label className={LABEL}>Contact Phone Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className={inputClass('contactPhone')}
              />
              {fieldErrors.contactPhone && <p className="mt-1 text-xs text-red-500">{fieldErrors.contactPhone}</p>}
            </div>
            <ImageUploadField label="Contact Headshot" token={token} field="headshot" onUploaded={setHeadshotUrl} error={fieldErrors.headshot} />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {submitError ? (
            <p className="flex-1 text-sm text-red-600">{submitError}</p>
          ) : <span />}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {isSubmitting ? 'Submitting…' : (
              <>
                <CheckCircle size={14} />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
