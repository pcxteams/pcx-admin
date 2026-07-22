'use client';

import { useState } from 'react';
import AddWorkspaceModal from './AddWorkspaceModal';

export default function AddWorkspaceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
      >
        + Add Workspace
      </button>
      {open && <AddWorkspaceModal onClose={() => setOpen(false)} />}
    </>
  );
}
