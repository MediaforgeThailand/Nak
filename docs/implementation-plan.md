# MVP Implementation Plan

1. Scaffold a Vercel-ready Next.js App Router project.
2. Create Supabase schema, RLS, storage buckets, and RPC functions.
3. Build customer flows: auth, pending access, dashboard, product list, cart/checkout, orders, payment submission, transactions, profile/addresses.
4. Build admin/staff flows: dashboard, products, stock, orders, payment verification, customers, user/role permissions, settings.
5. Keep critical operations server-side through Supabase RPC.
6. Verify with lint, production build, and Supabase MCP/CLI table inspection.
