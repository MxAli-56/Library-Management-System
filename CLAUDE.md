# Library Management System — Frontend + Backend

## Tech Stack
- Frontend: React 19, Vite, Tailwind CSS, React Router v7, React Hook Form, Zod, react-hot-toast, axios
- Backend: Node.js, Express, Prisma ORM, MySQL, JWT, Joi, bcrypt

## Folder Structure
- `frontend/react/src/pages/admin/` — admin panel pages (Users.jsx, Books.jsx, Memberships.jsx, etc.)
- `frontend/react/src/pages/user/` — user-facing pages
- `frontend/react/src/zod/` — Zod validation schemas
- `frontend/react/src/routes/` — PrivateRoutes.jsx, ProtectedRoutes.jsx, StaffRoute.jsx
- `frontend/react/src/context/` — AuthContext.jsx
- `frontend/react/src/api/axios.js` — axios instance
- `backend/controller/` — controllers
- `backend/routes/` — route files
- `backend/middleware/` — Auth.js, Access.js, Joi schemas
- `backend/config/` — db.js, sortableFields.js
- `backend/enum/` — Stamp.enum.js
- `backend/utils/` — helpers

## Coding Conventions (STRICT)
- **NO COMMENTS** anywhere in the code (no `//`, no `/* */`). Zero comments.
- **Beginner-friendly** code — simple variable names, straightforward logic
- **No shortcuts** — write explicit steps, avoid clever one-liners
- **Consistent naming**:
  - Fetch functions: `fetchBooks`, `fetchData`, `fetchFormData`
  - Handlers: `handleSubmit`, `handleSortChange`, `handleDelete`, `handleRestore`
  - States: `books`, `loading`, `search`, `sortBy`, `order`, `limit`, `offset`, `total`, `showForm`, `editingBook`, `deleteTarget`, `submitting`
- **No arrow function props shortcuts** — use `onClick={() => fn()}` even for parameterless
- **No destructuring in function params** — destructure inside function body
- **Imports order**: React → react-router-dom → context → toast → api → zod schemas
- **Axios calls**: always `await api.get/post/patch/delete` with async/await inside try-catch
- **Error handling**: try → catch with `console.error(error)` and `toast.error(error.response?.data?.message || "fallback")`
- **Zod schemas**: separate file per entity in `src/zod/`, mirror Joi rules from backend
- **Paginated responses**: always return `{ data, pagination: { total, limit, offset, next } }`

## Reference Patterns
- **CRUD page pattern**: `frontend/react/src/pages/admin/Users.jsx` (canonical)
- **Zod pattern**: `frontend/react/src/zod/userZod.js`
- **Backend controller pattern**: `backend/controller/StaffController.js` — `getAllUsers` function
- **Backend route pattern**: `backend/routes/StaffRoute.js`
- **Config pattern**: `backend/config/sortableFields.js`

## Key Rules for CRUD Pages
- All CRUD pages use the exact same structure as `Users.jsx`: list + search + filter + sort + pagination + form (inline) + delete modal (custom, `bg-black/30 backdrop-blur-sm`)
- No `window.confirm` — always custom modal
- No `show_deleted` toggle, no restore feature (removed per project decision)
- Permission: Owner/Admin/Librarian all have full CRUD for Books, Memberships, Borrows, Requests, Roles, Access, Branches (except Users, which stays Owner-only CRUD)
- Delete always soft-delete via backend `deleted_at`
- Forms use React Hook Form + Zod resolver + `reset()` for edit prefill
- Delete modal has two buttons: Cancel (gray) and Delete (red)

## Backend Rules
- All list endpoints support: search, filter, sort, limit, offset
- All list endpoints return `{ data, pagination }`
- Sort whitelist per entity in `backend/config/sortableFields.js`
- Stamp checks via `requiredAccess('stamp_name')` middleware
- Filtration via stamps with `_staff` suffix names + `unlock_roles` JSON

CRITICAL AXIOS INTERCEPTOR RULE:
- In src/api/axios.js, response interceptor MUST return Promise.reject(error) 
  for ALL errors, not just 401.
- Structure:
    (error) => {
        if (error.response?.status === 401) {
            // handle 401 logic
        }
        return Promise.reject(error);  // outside if
    }
- Never wrap return inside an if block — otherwise 409/400/500 errors get swallowed
  and axios treats them as success.

CRITICAL BACKEND DUPLICATE CHECK:
- For unique fields (isbn for books, email for users, name for memberships), 
  check with findFirst WITHOUT deleted_at filter. If soft-deleted duplicate exists, 
  the create will fail with P2002. So check must include soft-deleted rows.

CRITICAL CATCH BLOCK:
- Every create/update controller catch block should include:
    if (error.code === "P2002") {
        return res.status(409).json({ message: "Duplicate value" });
    }
    return res.status(500).json({ message: "Internal Server Error" });

PRISMA MODEL vs RELATION:
- Use prisma.<modelName> for database queries (e.g., prisma.status, prisma.membership).
- The relation name (e.g., membershipstatus) is only used in include: { relationName: true }.
- Never use prisma.<relationName> for queries — that model doesn't exist.

ROUTE PATH VERIFICATION:
- BEFORE writing any frontend API calls, read the backend route file completely.
- List exact paths and HTTP methods from the route file.
- Never assume paths from other controllers — each route file may differ.
- Example: /membership vs /membership/create vs /membership/update/:id

## Category Module (added)

### Concept
- Categories are GLOBAL (not branch-specific).
- Used by books (each book has `category_id`).
- Admin/Owner/Librarian all have full CRUD access via 5 stamps: `view_category`, `view_create_category`, `view_update_category`, `view_delete_category`, `view_restore_category`.

### Endpoints (new, in `CategoryRoute.js`)
- POST   `/category/create`
- PATCH  `/category/update/:id`
- DELETE `/category/delete/:id`
- PATCH  `/category/restore/:id`
- GET    `/category/getall`     (paginated list, search/sort/filter)
- GET    `/category/:id`        (single category by id)

### IMPORTANT — Do NOT touch existing categories endpoint
- `/book/categories` (in `BookRoute.js` + `BookController.js`) is used by the Books form dropdown.
  - It returns a lightweight list: `{ data: [{ category_id, name }] }`
  - Keep it exactly as-is. Do not rename, move, or remove it.
- The new `/category/*` routes are for the admin CRUD page only.

### Duplicate check for category name
- Unique field: `name`.
- Duplicate check uses `findFirst({ where: { name } })` WITHOUT `deleted_at` filter.
- Catch block includes P2002 → 409.

### Delete block rule
- Before soft-deleting a category, check if any live book references it:
  `prisma.book.findFirst({ where: { category_id, deleted_at: null } })`
- If any book uses it, return 409:
  "Cannot delete category. Books are assigned to it."
- Otherwise, soft-delete via `deleted_at = new Date()`.

### Frontend
- New page: `frontend/react/src/pages/admin/Categories.jsx`
- Mirror `Users.jsx` structure exactly.
- Zod schema: `frontend/react/src/zod/categoryZod.js` with `name` only.
- Sidebar: add "Categories" item at the END (after Branches).
- Route: `/dashboard/admin/categories` inside the same StaffRoute + Layout wrapper.