// Supabase has been fully removed from Dwelling.
// Auth is handled by api/auth.js + localAuth.js (JWT + Turso).
// This file exists only to avoid import errors if any stray reference remains.
export const supabase = null
