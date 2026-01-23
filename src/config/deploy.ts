/**
 * Deployment Configuration and Production Security Checklist
 */

export const DEPLOY_CONFIG = {
  // Production Security Checklist
  security: {
    rls_enabled: true,
    ssl_enforced: true,
    jwt_verification: true,
    environment_separation: true,
    audit_logs_active: true,
  },

  // Performance Optimization
  performance: {
    isr_enabled: true,
    image_optimization: true,
    code_splitting: true,
    edge_functions: false, // Set to true if using edge
  },

  // Environment Variables needed for Vercel
  required_env: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL',
  ],

  // Monitoring
  monitoring: {
    sentry_dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || null,
    log_level: 'info',
  }
};

export const DEPLOY_INSTRUCTIONS = `
# Deployment Steps

1. Push code to GitHub repository.
2. Connect repository to Vercel.
3. Add the following Environment Variables in Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (Keep secret)
   - NEXT_PUBLIC_SITE_URL (Your domain)
4. Enable Supabase Realtime for the project in Supabase Dashboard.
5. Apply all migrations from 00_DATABASE_FOUNDATION.sql.
6. Verify email/password authentication is working in production.
`;
