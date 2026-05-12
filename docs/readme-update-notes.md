## README Updates - Products & Layout

- Added feature description for:
  - Admin product management (list, create, update, delete)
  - CSV product import per business
  - New admin layout with left sidebar and user profile avatar
- Documented new backend admin endpoints:
  - `GET /admin/businesses/:id/products`
  - `POST /admin/businesses/:id/products`
  - `PATCH /admin/businesses/:id/products/:productId`
  - `DELETE /admin/businesses/:id/products/:productId`
  - `POST /admin/businesses/:id/products/bulk-create`
- Updated project structure section to include:
  - `src/components/admin/AdminSidebar.tsx`
  - `src/components/admin/AdminHeader.tsx`
  - `src/app/admin/*` pages






