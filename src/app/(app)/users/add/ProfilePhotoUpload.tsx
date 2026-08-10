'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Local-only preview — no upload endpoint exists yet, so this just holds the
 * File in memory and previews it via an object URL. Wiring an actual upload
 * (mirroring the presigned-URL pattern already used for workspace logos in
 * s3.service.ts) is a backend step for later.
 */
export default function ProfilePhotoUpload({ file, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived during render rather than synced via setState-in-effect; the
  // effect below only handles revoking the previous URL, not state updates.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(candidate: File | undefined | null) {
    if (!candidate) return;
    if (!['image/png', 'image/jpeg'].includes(candidate.type)) {
      setError('Only PNG or JPG files are supported.');
      return;
    }
    if (candidate.size > MAX_SIZE) {
      setError('File must be 5MB or smaller.');
      return;
    }
    setError(null);
    onChange(candidate);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {previewUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote/optimizable image */}
            <img src={previewUrl} alt="Profile preview" className="w-14 h-14 rounded-full object-cover" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{file?.name}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 cursor-pointer"
              >
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <Upload size={22} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Drag &amp; drop or click to upload</p>
            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
            <span className="mt-1 inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white">
              Choose File
            </span>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
