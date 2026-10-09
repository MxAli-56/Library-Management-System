# Library Management System — Documentation

## Overview

Multi-branch library management system. Manages books, members, staff, borrowings, and memberships across multiple physical library branches. Four user roles: Owner, Admin, Librarian, Member. Staff manage operations via an admin panel; members browse books, borrow, and manage memberships via a user dashboard.

---

## 1. User Roles

| **Owner** | Everything. Manage all branches, staff, roles, accesses, books, memberships, borrows, requests. View global dashboard stats. Cannot be deleted by anyone.

| **Admin** | Same as Owner except cannot assign/remove access stamps. Cannot modify Owner-only settings. 

| **Librarian** | Manage books, borrows, requests, memberships — but only within their assigned branches. Cannot see data from branches they aren't assigned to. Cannot manage roles or accesses.

| **Member** | Browse books, borrow, submit book requests, view own borrows, view/manage own membership, update profile. No access to admin panel or staff data. 

---

## 2. The Stamp System

Permissions in this system are called **stamps**. Instead of checking role names directly, every protected action checks whether the user's role contains a specific stamp.

**Mapping:**
- `role` table → roles (Owner, Admin, Librarian, Member)
- `access` table → individual stamps (`view_book`, `view_create_book`, etc.)
- `role_access` table → links roles to stamps (many-to-many)
- `user_role` table → links users to roles

**Why dynamic:** Owner can add a new stamp to a role and it takes effect immediately — no code change needed.


---

## 3. Branch System

A **branch** is a physical library location (Main Branch, North Branch, City Branch, etc.).

**Book vs stock:**
- Book metadata (name, author, ISBN, prices, cover) is stored **once** in the `book` table.
- Quantity is stored **per branch** in the `branch_stock` table.
- Same book can exist in multiple branches with different stock.

**Data visibility:**
- **Owner / Admin** → see everything across all branches.
- **Librarian** → sees only their assigned branch(es). If assigned to City and Main, they see data from both; if only City, only City.
- **Member** → sees only their own branch's books and their own records.

**How it works:** When a librarian requests data, the backend checks their assigned branches (`user_branch` table) and filters results accordingly. Owner/Admin bypass this filter entirely.

---

## 4. Core Features

### Registration & Login
Public signup with name, email, password. New users get the default **Member** role automatically. Login returns a JWT token + user profile (role, stamps, branches).

### Profile Management
Users view their name, email, role, branches, membership, and change password.

### Password Reset
User submits email → receives reset link → clicks link → sets new password. Token expires after a set time. See Section 15 for full flow.

### Membership Plans
Three tiers:
- **Bronze** — fee 1500, 30-day validity, 15% discount, 1 book limit, 10-day borrow period
- **Silver** — fee 2000, 30-day validity, 20% discount, 2 book limit, 20-day borrow period
- **Gold** — fee 2500, 30-day validity, 25% discount, 3 book limit, 30-day borrow period

### Membership Allocation
Staff selects a user + plan + branch and allocates. The system computes start/end dates. If the user has no role yet, they get the default Member role. If they already have a membership, it's overwritten (renewed). The user's `user_branch` is also updated to the allocation branch.

### Book Management
Staff add books with metadata + initial stock + branch. Cover image is optional but recommended. Same ISBN in different branches shares one book record but has separate stock. Editing can update metadata, cover, or quantity for a specific branch.

### Book Requests
Members request books not in the library. Request routes to their branch. Staff either:
- **Approve** — uploads/provides cover, sets quantity, prices, category → book is created in library + stock added to the branch.
- **Reject** — provides a rejection reason → member sees it in their request list.

### Book Borrowing
Staff allocates a book to a member. Payment is split 50/50:
- **Allocation:** 50% of borrow price collected, book marked as borrowed, branch stock decrements.
- **Return:** remaining 50% + any late fine collected, book marked returned, branch stock increments.

Late fine = days_late × book.fine_per_day.

### Category Management
Staff create/manage categories. Each book belongs to one category. Cannot delete a category that has books assigned.

### Access & Role Management
Owner creates roles and stamps. Assigns stamps to roles. Roles assigned to users. Everything takes effect immediately.

### Owner Dashboard
Stats shown: total books, total users, total branches, active memberships, active borrows, overdue borrows, pending requests, total revenue. Plus branch-wise breakdown (books, borrows, members per branch) and recent activity (last 5 borrows, last 5 requests).

---

## 5. Business Rules

- **Borrow payment:** 50% at allocation + 50% at return. Exact amounts enforced by backend (within 0.01 tolerance).
- **Membership payment:** 100% upfront at allocation.
- **Late fine:** `days_late × fine_per_day`. Added to return payment.
- **Borrow limits:** Bronze=1, Silver=2, Gold=3 active borrows at a time.
- **Borrow duration:** Bronze=10, Silver=20, Gold=30 days.
- **Discounts on borrow price:** Bronze=15%, Silver=20%, Gold=25%.
- **ISBN uniqueness:** NOT globally unique. Same ISBN can exist in multiple branches. Within a single branch, only one stock entry per ISBN.
- **Cover image:** If user doesn't provide one, staff must upload before approval.
- **Rejection reason:** Optional but stored and visible to the requesting member.

---

## 6. Edge Cases

- **No membership:** Borrow blocked, staff must allocate membership first.
- **Book out of stock in branch:** Borrow blocked at that branch.
- **ISBN already in branch:** Request rejected with message.
- **Membership expires mid-borrow:** Active borrow continues until due date; new borrows blocked.
- **Cover missing on approval:** Approval blocked with error.
- **Expired/invalid reset token:** Reset page shows error, no form.

---

## 7. End-to-End Workflows

### Full Member Journey
1. User registers with name, email, and password → system assigns the Member role automatically.
2. Staff (Librarian or Admin) allocates a membership plan (Bronze, Silver, or Gold) to the user for a specific branch.
3. System sets `start_date` to now and `end_date` to now plus the plan's duration; user's `user_branch` is linked to that branch.
4. User browses the book catalog filtered to their branch and asks staff to borrow a book.
5. Staff creates the borrow: user pays 50% of the discounted price upfront; branch stock decrements by 1; due date is set based on the plan's borrow days.
6. User returns the book: remaining 50% plus any late fine is collected; stock increments by 1; borrow record is closed.

### Full Branch Setup Journey
1. Owner creates a new branch record (name, location) in the system.
2. Owner assigns a staff account the Librarian role and links it to that branch via `user_branch`.
3. Librarian logs in and sees only books, borrows, and requests scoped to their assigned branch.
4. Librarian adds books with title, author, ISBN, borrow price, fine rate, category, and initial stock quantity.
5. A member submits a book request for a title not yet in the library; the request is stored with status Pending against the member's branch.
6. Librarian reviews the request, uploads a cover image if the member did not provide one, sets quantity, prices, and category, then approves.
7. System creates the book record in the catalog and adds a `branch_stock` row for the approving branch.
8. Member borrows the newly added book through the standard borrow workflow.

### Password Reset Journey
1. User visits Forgot Password and submits their email address.
2. Backend generates a 64-character hex token via `crypto.randomBytes(32)`, stores it in `reset_token` with an expiry in `reset_token_expiry`, and sends the link by email.
3. User clicks the link; frontend reads the token from the URL and immediately calls the verify-reset-token endpoint.
4. If valid, the password reset form is shown; if expired or invalid, an error screen appears with an option to request a new link.
5. User submits a new password; backend re-verifies the token, hashes the password with bcrypt, saves it, and sets both `reset_token` and `reset_token_expiry` to null.
6. Frontend displays a success message and redirects the user to login.

### Membership Expiry and Renewal Journey
1. Member's `end_date` passes; any new borrow attempt is blocked with a membership error.
2. Staff opens the membership allocation form, selects the user, and chooses a plan and branch.
3. Backend upserts the existing `user_membership` row: updates `start_date` to now and `end_date` to now plus the plan's duration. No duplicate row is created.
4. Member's `user_branch` is updated if the renewal targets a different branch.
5. Member can borrow again immediately after renewal.

---

## 8. Tech Stack

**Backend:**
- Node.js — runtime
- Express — web framework
- Prisma — ORM for MySQL
- MySQL — database
- JWT — session tokens
- bcrypt — password hashing
- Joi — request body validation
- multer — file upload handling
- nodemailer — email (via Mailtrap in dev)

**Frontend:**
- React 19 — UI
- Vite — build tool
- Tailwind CSS — styling
- React Router v7 — routing
- React Hook Form — form handling
- Zod — client-side validation
- axios — HTTP client
- react-hot-toast — notifications

---

## 9. Architecture

    React (browser)
    │
    │ HTTP + JWT
    ▼
    Express server
    │
    ├── Middleware: authenticate → requiredAccess → multer → Joi
    │
    ├── Controller: business logic, branch filtering, calculations
    │
    ▼
    Prisma ORM
    │
    ▼
    MySQL database

**Request flow:**
1. React sends request with JWT in Authorization header.
2. `authenticate` middleware verifies JWT, attaches user to `req.user`.
3. `requiredAccess('stamp_name')` checks if user's role has that stamp.
4. Joi validates request body.
5. Controller runs business logic and Prisma queries.
6. Response sent back; frontend updates UI + shows toast.

**Response flow:**
1. MySQL returns data to Prisma.
2. Controller formats as `{ data, pagination }` or `{ success, message }`.
3. Express sends HTTP response.
4. Axios interceptor handles 401 (redirect to login) and errors.
5. React updates state, renders, shows toast.

---

## 10. Database Schema

| Table | Purpose | Key relationships |
| :--- | :--- | :--- |
| `user` | Users (members + staff) | Has many user_role, user_branch, book_borrow, book_request, user_late |
| `role` | Role definitions (Owner, Admin, Librarian, Member) | Has many user_role, role_access |
| `access` | Individual permission stamps | Has many role_access |
| `role_access` | Links roles to stamps | Belongs to role, access |
| `user_role` | Links users to roles | Belongs to user, role |
| `branch` | Physical library branches | Has many user_branch, branch_stock, book_borrow, book_request, user_membership |
| `user_branch` | Links users to branches | Belongs to user, branch |
| `membership` | Membership plan definitions (Bronze/Silver/Gold) | Has many user_membership |
| `user_membership` | Active membership per user | Belongs to user (unique), membership, branch |
| `category` | Book categories | Has many book |
| `book` | Book metadata (one per ISBN) | Belongs to category, has many branch_stock, book_borrow |
| `branch_stock` | Book quantity per branch | Belongs to branch, book (unique pair) |
| `book_request` | Member book requests | Belongs to user, branch, status |
| `book_borrow` | Borrow records | Belongs to user, book, branch, status |
| `late_return` | Late fine audit records | Belongs to book_borrow (unique), status |
| `user_late` | Links users to their late returns | Belongs to user, late_return |
| `status` | Lookup table for state labels | Referenced by book_borrow, book_request, late_return, membership |

All tables use **soft delete** via `deleted_at` column.

**Why branch_stock exists:** Book metadata is universal; only quantity varies per branch. Splitting them avoids duplicating author/cover/price per branch and prevents metadata drift.

**Why user_branch is many-to-many:** A librarian can be assigned to multiple branches. A member can technically have a home branch that gets updated when membership changes.

**Why user_membership is 1-to-1 with user:** A user has exactly one active membership at a time. Enforced by unique constraint on `user_id`.

**Why ISBN is not globally unique:** Same book can be stocked in multiple branches. Uniqueness enforced per (branch, book) via `branch_stock`.

---

## 11. Authentication & Authorization

**JWT flow:**
1. User logs in → backend signs JWT with `{ id, email }` → returns token.
2. Frontend stores token in `localStorage`.
3. Axios interceptor adds `Authorization: Bearer <token>` to every request.
4. On 401 response, token is cleared and user redirected to login.

**Auth middleware (`authenticate`):**
- Reads Authorization header.
- Verifies JWT signature and expiry.
- Attaches decoded user to `req.user`.
- Returns 401 if invalid/missing.

**Access middleware (`requiredAccess`):**
- Takes a stamp name parameter.
- Fetches user's active roles from `user_role`.
- Checks if any role has the required stamp via `role_access` → `access`.
- Returns 403 if not found, else calls `next()`.

**isPrivileged concept:**
- Owner and Admin are considered "privileged".
- They bypass branch filters entirely.
- Determined by `getStaffBranchScope(userId)` utility.

---

## 12. Branch Filtering

**`getStaffBranchScope(userId)` returns:**
- `{ isPrivileged: true, branchIds: null }` — for Owner/Admin
- `{ isPrivileged: false, branchIds: [1, 5] }` — for Librarian (their branches)
- `{ isPrivileged: false, branchIds: [] }` — if no branches assigned

**How endpoints filter:**
- **Books:** Non-privileged users see only books with stock in their branches. Privileged users see all; can filter by branch via query param.
- **Users:** Non-privileged see only users assigned to their branches. Privileged see all.
- **Borrows / Requests:** Filtered by `branch_id IN scope.branchIds`.
- **Memberships:** Plans are global. Allocation is restricted — librarian can only allocate to their branches.

**Special case — membership allocation:**
- Librarian must be able to search ANY user (including new users without role/branch).
- `getAllUsers?includeRoleless=true` allows this.
- But when allocating, backend validates the branch is within the librarian's scope.

---

## 13. File Upload System

**Multer setup:**
- Files saved to `backend/uploads/covers/`
- Folder auto-created if missing

**Filename:** `{timestamp}-{random}.{ext}` (e.g., `1730456789012-847291034.jpg`)

**Limits:**
- Max 2 MB
- Types: jpg, jpeg, png, webp

**Cleanup:** When a book's cover is replaced, old file is deleted from disk.

**Serving:** Static route `/uploads` → `backend/uploads/`. Frontend renders via `{VITE_API_URL}/uploads/covers/{filename}`.

---

## 14. Email System

**Provider:** Nodemailer + Mailtrap (dev sandbox).

**Config:** Host, port, username, password from `.env`.

**Currently sends:** Only password reset emails.

**Content:** Styled HTML with a reset button linking to the frontend reset URL containing the token.

---

## 15. Password Reset Flow

**Backend — token creation:**
1. User submits email → backend checks user exists.
2. If exists: generates 32-byte random hex token (`crypto.randomBytes(32)`).
3. Stores token + expiry in `user.reset_token` and `user.reset_token_expiry`.
4. Sends email with link: `{FRONTEND_URL}/reset-password?token={token}`.
5. If email doesn't exist: returns same success message (prevents user enumeration).

**Frontend — verification:**
1. Reset page loads with token in URL query.
2. Immediately calls `GET /auth/verify-reset-token/:token`.
3. If valid: shows password form.
4. If invalid/expired: shows error screen with "Request New Link" button.
5. **Auto-revalidation:** every 5 seconds + on `focus` + on `visibilitychange`, re-checks token. If it expires while page is open, form is removed.

**Reset execution:**
1. User submits new password.
2. Backend re-checks token + expiry.
3. Hashes password with bcrypt, updates user, **wipes reset_token and reset_token_expiry** (single-use).
4. Frontend redirects to login.

---

## 16. Book Borrowing Flow (Technical)

**Allocation (`POST /borrow/create`):**
1. Check user has an active membership (else 403).
2. Check branch stock > 0 (else 409).
3. Check user's active borrow count < membership.borrow_limit (else 409).
4. Compute discounted price: `borrow_price × (1 - discount/100)`.
5. Expected allocation payment: `discounted × 0.5`.
6. Validate submitted `amount_paid_allocate` matches within 0.01.
7. Create `book_borrow` with `branch_id`, `due_date = now + borrow_days`.
8. Decrement `branch_stock.quantity` by 1.

**Return (`PATCH /borrow/return`):**
1. Find active borrow record.
2. Compute `days_late = max(0, ceil((now - due_date) / 1 day))`.
3. Compute `fine = days_late × book.fine_per_day`.
4. Expected return payment: `discounted × 0.5 + fine`.
5. Validate submitted `amount_paid_return`.
6. Update borrow: `return_date`, `amount_paid = allocate + return + fine`, `amount_paid_return`, status (Returned or Late Returned).
7. If late, create `late_return` audit record.
8. Increment `branch_stock.quantity` by 1.

---

## 17. Book Request Flow (Technical)

**Creation (`POST /request/create`):**
1. User submits name, author, ISBN, optional cover.
2. Backend checks if ISBN already exists in user's branch stock → 409 if so.
3. Checks if user already has pending/approved request for this ISBN → 409 if so.
4. If user has a rejected request for this ISBN, reactivates it (status → Pending, updates details).
5. Otherwise creates new request with `branch_id` = user's branch, status = Pending.

**Approval (`PATCH /request/approve/:id`):**
1. Staff provides quantity, prices, category, and cover (required if user didn't provide).
2. Backend verifies request is Pending.
3. Verifies ISBN not already in book table.
4. Verifies cover exists (from request or staff upload).
5. Creates `book` record with metadata + cover.
6. Creates `branch_stock` for the approving branch with initial quantity.
7. Updates request status → Approved.

**Rejection (`DELETE /request/reject/:id`):**
1. Staff provides optional `rejection_reason`.
2. Updates request status → Rejected, stores reason.
3. Reason visible to user in their request list.

---

## 18. Membership Flow (Technical)

**Plan fields:** `fee`, `duration` (days), `discount` (%), `borrow_limit`, `borrow_days`.

**Allocation (`POST /membership/allocate`):**
1. Validate staff has permission for the target branch.
2. Compute `start_date = now`, `end_date = now + plan.duration days`.
3. Upsert `user_membership` (update if exists, create otherwise).
4. Delete existing `user_branch` entries for the user, create one for the new branch (sync).
5. If user has no role, assign default Member role.

**Expiry check:** `end_date > now` = active.

**Response (`GET /membership/my-membership`):** Returns plan name, fee, discount, borrow_limit, borrow_days, branch name, start_date, end_date, status.

---

## 19. API Endpoints

### Auth (`/auth`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Public | Register new user |
| `POST` | `/login` | Public | Login, get JWT |
| `GET` | `/profile` | Auth | Get current user profile |
| `POST` | `/forgot-password` | Public | Request reset link |
| `POST` | `/reset-password` | Public | Reset password with token |
| `GET` | `/verify-reset-token/:token` | Public | Validate token |
| `PATCH` | `/update-password` | Auth | Update own password |

### Staff (`/staff`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/insert` | Auth | Create staff/user |
| `GET` | `/getallusers` | `view_staff` | List users |
| `GET` | `/getuser/:id` | `view_staff` | Get user |
| `PATCH` | `/updateuser/:id` | `view_update_user` | Update user |
| `DELETE` | `/deleteuser/:id` | `view_delete_user` | Soft delete user |
| `PATCH` | `/restoreuser/:id` | `view_restore_user` | Restore user |

### Books (`/book`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_book` | Create book |
| `PATCH` | `/update/:id` | `view_update_book` | Update book |
| `DELETE` | `/delete/:id` | `view_delete_book` | Soft delete book |
| `PATCH` | `/restore/:id` | `view_restore_book` | Restore book |
| `GET` | `/categories` | Auth | Category dropdown list |
| `GET` | `/getall` | Auth | List books |
| `GET` | `/:id` | Auth | Book detail |

### Borrow (`/borrow`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_borrow_book` | Allocate borrow |
| `PATCH` | `/return` | `view_borrow_book` | Return borrow |
| `GET` | `/getall` | `view_borrow` | List borrows |
| `GET` | `/my-active` | Auth | User's active borrow |
| `GET` | `/my-borrows` | Auth | User's borrow history |
| `GET` | `/:id` | `view_borrow` | Borrow detail |

### Requests (`/request`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_request` | Submit request |
| `GET` | `/getall` | `view_request` | List requests |
| `GET` | `/my-request` | Auth | User's requests |
| `GET` | `/:id` | `view_request` | Request detail |
| `PATCH` | `/approve/:id` | `view_approve_request` | Approve request |
| `DELETE` | `/reject/:id` | `view_delete_request` | Reject request |

### Memberships (`/membership`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_membership` | Create plan |
| `PATCH` | `/update/:id` | `view_update_membership` | Update plan |
| `DELETE` | `/delete/:id` | `view_delete_membership` | Soft delete plan |
| `PATCH` | `/restore/:id` | `view_restore_membership` | Restore plan |
| `GET` | `/getall` | `view_membership` | List plans |
| `GET` | `/available` | Auth | Public plan list |
| `GET` | `/my-membership` | Auth | User's membership |
| `POST` | `/allocate` | `view_create_membership` | Allocate plan to user |
| `GET` | `/:id` | `view_membership` | Plan detail |

### Access (`/access`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_access` | Create stamp |
| `PATCH` | `/update/:id` | `view_update_access` | Update stamp |
| `DELETE` | `/delete/:id` | `view_delete_access` | Soft delete stamp |
| `PATCH` | `/restore/:id` | `view_restore_access` | Restore stamp |
| `GET` | `/getall` | `view_access` | List stamps |
| `GET` | `/:id/roles` | `view_assign_access` | Roles for stamp |
| `PATCH` | `/:id/roles` | `view_assign_access` | Update role assignments |
| `GET` | `/:id` | `view_access` | Stamp detail |

### Roles (`/role`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_role` | Create role |
| `PATCH` | `/update/:id` | `view_update_role` | Update role |
| `DELETE` | `/delete/:id` | `view_delete_role` | Soft delete role |
| `PATCH` | `/restore/:id` | `view_restore_role` | Restore role |
| `GET` | `/getall` | `view_role` | List roles |
| `GET` | `/:id` | `view_role` | Role detail |

### Stamp Assignment (`/stamp`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/assign` | `view_assign_stamp` | Assign stamp to role |
| `DELETE` | `/remove` | `view_remove_stamp` | Remove stamp from role |
| `PATCH` | `/restore` | `view_restore_stamp` | Restore removed stamp |

### Branches (`/branch`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_branch` | Create branch |
| `PATCH` | `/update/:id` | `view_update_branch` | Update branch |
| `DELETE` | `/delete/:id` | `view_delete_branch` | Soft delete branch |
| `PATCH` | `/restore/:id` | `view_restore_branch` | Restore branch |
| `GET` | `/getall` | `view_branch` | List branches |
| `GET` | `/:id` | `view_branch` | Branch detail |

### Categories (`/category`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | `view_create_category` | Create category |
| `PATCH` | `/update/:id` | `view_update_category` | Update category |
| `DELETE` | `/delete/:id` | `view_delete_category` | Soft delete category |
| `PATCH` | `/restore/:id` | `view_restore_category` | Restore category |
| `GET` | `/getall` | `view_category` | List categories |
| `GET` | `/:id` | `view_category` | Category detail |

### Status (`/status`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | List statuses (filter by type) |

### Dashboard (`/dashboard`)

| Method | Path | Stamp | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/stats` | `view_dashboard_stats` | Owner stats |

---

## 20. Frontend Routing

**Public routes (no auth):**
- `/login`, `/register`, `/forgot-password`, `/reset-password`, 404 fallback

**Protected routes (`/dashboard/*`):**
- All routes wrapped in `ProtectedRoute` (checks token exists).
- Admin routes wrapped in `StaffRoute` (checks `view_admin_panel` stamp).
- Non-staff visiting admin route → redirected to `/dashboard`.

**Member routes:**
- `/dashboard`, `/dashboard/books`, `/dashboard/books/:id`, `/dashboard/my-borrows`, `/dashboard/book-request`, `/dashboard/membership`, `/dashboard/profile`

**Admin routes:**
- `/dashboard/admin` — admin home
- `/dashboard/admin/stats` — Owner dashboard
- `/dashboard/admin/users`, `/books`, `/borrows`, `/requests`, `/memberships`, `/roles`, `/access`, `/branches`, `/categories`

**Sidebar config** (`sidebarConfig.js`) maps each role to visible menu items. Member has empty admin menu.

---

## 21. Frontend State Management

**AuthContext:**
- `user` — current user object (id, name, email, role, stamps, branches, hasMembership)
- `token` — JWT
- `loading` — initial profile fetch status
- Methods: `login()`, `logout()`, `refreshUser()`

**Why fetch profile on every refresh:** Stamps are not stored in localStorage — only the JWT is. On refresh, `AuthContext` calls `/auth/profile` to fetch fresh user data (in case admin changed roles/stamps). This prevents stale permissions.

**Form handling:** React Hook Form + Zod resolver. Forms register fields, Zod validates on submit, `reset()` prefills edit forms.

**Debounced search (300ms):** User and book search inputs use `useRef` + `setTimeout` pattern. Only fires API call after user stops typing for 300ms. Prevents excessive requests.

---

## 22. Optimization Patterns

**Lazy loading:** Dropdowns (categories, branches, roles) fetch their data only when the form/modal opens, not on page load.

**Server-side search:** Search queries run on backend with `?search=` param, not client-side filtering.

**Single call per page:** Lists fetch everything needed in one request. Statuses/lookup lists are bundled into the main list response.

**Network calls per page:**

| Page | On load | On form open | On action |
| :--- | :--- | :--- | :--- |
| Books (admin) | 2 (`/book/getall`, `/branch/getall`) | 1 (`/book/categories`) | 1 per CRUD |
| Users (admin) | 1 (`/staff/getallusers`) | 2 (`/role/getall`, `/branch/getall`) | 1 per CRUD |
| Borrows (admin) | 1 (`/borrow/getall`) | 0 (lazy dropdowns via debounce) | 1 per allocate/return |
| Requests (admin) | 1 (`/request/getall`) | 1 (`/book/categories` on approve) | 1 per approve/reject |
| Memberships (admin) | 1 (`/membership/getall`) | 1 (`/branch/getall` on allocate) | 1 per CRUD/allocate |
| Roles (admin) | 1 (`/role/getall`) | 0 | 1 per CRUD |
| Access (admin) | 1 (`/access/getall`) | 0 | 1 per CRUD |
| Branches (admin) | 1 (`/branch/getall`) | 0 | 1 per CRUD |
| Categories (admin) | 1 (`/category/getall`) | 0 | 1 per CRUD |
| Stats (admin) | 1 (`/dashboard/stats`) | 0 | 0 |
| Books (user) | 1 (`/book/getall`) | 0 | 1 per search/page |
| My Borrows (user) | 1 (`/borrow/my-borrows`) | 0 | 0 |
| Book Request (user) | 1 (`/request/my-request`) | 0 | 1 per submit |
| Membership (user) | 2 (`/membership/my-membership`, `/membership/available`) | 0 | 1 per search |

---

## 23. Conventions

- **Soft delete:** All deletes set `deleted_at = now()`. Queries filter `deleted_at: null`.
- **Duplicate handling:** Prisma `P2002` error caught → 409 response.
- **Validation layers:** HTML5 hints (UI) + Zod (client) + Joi (server).
- **Zero comments in code.** Names should be self-explanatory.
- **Response formats:**
  - List: `{ data: [...], pagination: { total, limit, offset, next } }`
  - Single: `{ data: {...} }`
  - Action: `{ success: true, message }`
  - Error: `{ message }`

- **Stamp naming:**
  - `view_X` — list/detail access
  - `view_create_X` — create
  - `view_update_X` — update
  - `view_delete_X` — delete
  - `view_restore_X` — restore

---

## 24. Environment Variables

**Backend (`.env`):**

| Variable | Purpose |
| :--- | :--- |
| `DATABASE_URL` | MySQL connection string |
| `SERVER_PORT` | Express server port |
| `JWT_SECRET` | JWT signing secret |
| `ExpiresInTime` | JWT expiry (e.g., `7d`) |
| `FRONTEND_URL` | Used in reset email link |
| `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USERNAME`, `MAILTRAP_PASSWORD` | Email SMTP config |
| `RESET_TOKEN_EXPIRY` | Password reset token expiry (seconds) |

**Frontend (`.env`):**

| Variable | Purpose |
| :--- | :--- |
| `VITE_API_URL` | Backend base URL |