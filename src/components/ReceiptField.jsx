import { useState } from 'react';
import { CircleAlert, FileCheck2, FileText, Upload, X } from 'lucide-react';
import { useFeedback } from '../hooks/useFeedback';
import { MAX_RECEIPT_BYTES, getReceiptUrl, isPdf, receiptNameFromPath, uploadReceipt } from '../lib/receipts';
import { Spinner } from './ui';

export const ReceiptLink = ({ path, className = '' }) => {
  const { toast } = useFeedback();
  const [opening, setOpening] = useState(false);

  const openReceipt = async () => {
    // Open the tab during the click so popup blockers allow it, then point it at the signed link
    const tab = window.open('', '_blank');
    setOpening(true);
    const { data, error } = await getReceiptUrl(path);
    setOpening(false);

    if (error || !data?.signedUrl) {
      tab?.close();
      toast('Could not open the receipt. Please try again.', { tone: 'error' });
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = data.signedUrl;
    } else {
      window.location.assign(data.signedUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={openReceipt}
      disabled={opening}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 disabled:opacity-60 ${className}`}
    >
      {opening ? <Spinner className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      View receipt
    </button>
  );
};

// Uploads straight away and reports the stored path, so drafts and the review step only carry the path
export const ReceiptUpload = ({ id, path, onChange, readOnly = false }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    if (!isPdf(file)) {
      setError('Please choose a PDF file.');
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError('The PDF must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    const { path: newPath, error: uploadError } = await uploadReceipt(file);
    setUploading(false);

    if (uploadError) {
      setError('Upload failed. Please try again.');
      return;
    }
    onChange(newPath);
  };

  if (path) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
          <FileCheck2 className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{receiptNameFromPath(path)}</p>
          <p className="text-xs text-brand-700">Receipt attached</p>
        </div>
        <ReceiptLink path={path} />
        {!readOnly && (
          <button type="button" onClick={() => onChange('')} className="icon-btn hover:bg-red-50 hover:text-red-600" aria-label="Remove receipt">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (readOnly) {
    return <p className="rounded-xl border border-dashed border-gray-300 px-3.5 py-3 text-sm text-gray-500">No receipt attached.</p>;
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed bg-white px-4 py-3.5 transition-colors focus-within:ring-4 focus-within:ring-brand-600/15 hover:border-brand-600 hover:bg-brand-50/40 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          {uploading ? <Spinner className="h-[18px] w-[18px]" /> : <Upload className="h-[18px] w-[18px]" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{uploading ? 'Uploading…' : 'Upload the receipt from the accommodation'}</p>
          <p className="text-xs text-gray-500">PDF only, up to 5 MB</p>
        </div>
        <input
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          {error}
        </p>
      )}
    </div>
  );
};
