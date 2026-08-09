/* Browser-safe public Supabase configuration.
 * Never place service_role, secret keys, or the database password in this file.
 */
window.PERSONAL_SUPABASE_CONFIG = Object.freeze({
  url: 'https://zetpuzkejljlacnaqnfi.supabase.co',
  publishableKey: 'sb_publishable_sSiDe3a9MaH2ErBgYFMMGA_L2idCTag',
  table: 'workspace_state',
  saveDelayMs: 900
});
// Backward alias so older sync builds can still read the public configuration.
window.PHD_SUPABASE_CONFIG = window.PERSONAL_SUPABASE_CONFIG;
