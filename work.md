The Key Insight
You need ONE controller file per main entity. Not per table.

Entity	Controllers	Routes
User	userController.js	userRoutes.js
Book	bookController.js	bookRoutes.js
Borrow	borrowController.js	borrowRoutes.js
Membership	membershipController.js	membershipRoutes.js
Auth (Login/Register)	authController.js	authRoutes.js
What Controllers Do You Need?
Based on your schema, here's the list:

Entity	Tables Involved	What It Does
User	user, user_role, user_branch, user_membership	CRUD users, assign roles, assign branches
Book	book	CRUD books
Borrow	book_borrow, late_return, user_late	Issue, return, track late fees
Membership	membership, user_membership	CRUD membership plans, assign to users
Auth	user	Login, Register, JWT
You don't need controllers for junction tables (user_role, user_branch, etc.). They are handled through the main entities.

How to Think About Controllers
1. User Controller (userController.js)
Function	Purpose
getAllUsers	Get all users (with roles, branches, membership)
getUserById	Get a single user with their roles, branches, membership
createUser	Create a new user (with optional role, branch, membership)
updateUser	Update user details
deleteUser	Delete a user
assignRole	Assign a role to a user (using user_role)
assignBranch	Assign a branch to a user (using user_branch)
assignMembership	Assign a membership to a user (using user_membership)
Example Query:

javascript
const user = await prisma.user.findUnique({
  where: { user_id: 1 },
  include: {
    userrole: { include: { roleuser: true } },
    userbranch: { include: { branchuser: true } },
    usermembership: { include: { membershipuser: true } }
  }
});
2. Book Controller (bookController.js)
Function	Purpose
getAllBooks	Get all books
getBookById	Get a single book
createBook	Add a new book
updateBook	Update book details (price, quantity)
deleteBook	Remove a book
searchBooks	Search by name, author, ISBN
Example Query:

javascript
const books = await prisma.book.findMany({
  where: {
    OR: [
      { name: { contains: searchTerm } },
      { author: { contains: searchTerm } },
      { isbn: { contains: searchTerm } }
    ]
  }
});
3. Borrow Controller (borrowController.js)
Function	Purpose
issueBook	Create a borrow record (issue book to user)
returnBook	Return a book (calculate late fee if applicable)
getUserBorrows	Get all borrows for a user
getBorrowById	Get a single borrow with details
Example Query for Issuing:

javascript
// Check if book is available
const book = await prisma.book.findUnique({
  where: { book_id: bookId }
});
if (book.quantity < 1) {
  throw new Error('Book not available');
}

// Create borrow
const borrow = await prisma.book_borrow.create({
  data: {
    user_id: userId,
    book_id: bookId,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status_id: 7 // Active
  }
});

// Decrease quantity
await prisma.book.update({
  where: { book_id: bookId },
  data: { quantity: { decrement: 1 } }
});
4. Membership Controller (membershipController.js)
Function	Purpose
getAllMemberships	Get all membership plans
getMembershipById	Get a single membership plan
createMembership	Create a new plan (Gold, Silver, Basic)
updateMembership	Update a plan (fee, duration, discount)
deleteMembership	Delete a plan
assignMembershipToUser	Assign a user to a membership (using user_membership)
5. Auth Controller (authController.js)
Function	Purpose
register	Create a new user (with hashed password)
login	Verify email/password, return JWT token
logout	(Optional) Clear token
getProfile	Get current user profile (with roles, permissions)