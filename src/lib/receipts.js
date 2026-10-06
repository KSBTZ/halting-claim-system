import { supabase } from '../supabase/supabaseClient';

// Private Supabase Storage bucket, created by supabase/migrations (see DATABASE_SCHEMA.md)
const BUCKET = 'receipts';
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export const isPdf = (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

// Files live under receipts/<user id>/<timestamp>-<name>.pdf so storage policies can scope them per employee
export const uploadReceipt = async (file) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'signed-out' };

  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80);
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' });

  if (error) {
    console.error('Could not upload receipt:', error);
    return { error: error.message };
  }
  return { path };
};

export const receiptNameFromPath = (path) => (path || '').split('/').pop().replace(/^\d+-/, '') || 'Receipt.pdf';

// Short-lived link, since the bucket is private
export const getReceiptUrl = (path) => supabase.storage.from(BUCKET).createSignedUrl(path, 300);
