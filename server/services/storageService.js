'use strict';
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

let supabase = null;

function getClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

const BUCKET = () => process.env.SUPABASE_BUCKET || 'book-pdfs';

async function uploadFile(buffer, filename, folder) {
  const client = getClient();
  const ext = filename.split('.').pop() || 'pdf';
  const storagePath = `${folder}/${uuidv4()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET())
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: urlData } = client.storage
    .from(BUCKET())
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    path: storagePath
  };
}

async function uploadInteriorPdf(buffer, filename) {
  return uploadFile(buffer, filename, 'interior');
}

async function uploadCoverPdf(buffer, filename) {
  return uploadFile(buffer, filename, 'cover');
}

async function deleteFile(storagePath) {
  if (!storagePath) return;
  const client = getClient();
  const { error } = await client.storage
    .from(BUCKET())
    .remove([storagePath]);
  if (error) console.warn(`[Storage] Delete warning for ${storagePath}:`, error.message);
}

module.exports = { uploadInteriorPdf, uploadCoverPdf, deleteFile };
