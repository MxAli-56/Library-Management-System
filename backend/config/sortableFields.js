export const SORTABLE_FIELDS = {
  books: ["name", "total_price", "borrow_price", "created_at"],
  users: ["name", "created_at"],
  memberships: ["name", "fee", "duration", "created_at"],
  roles: ["name", "created_at"],
  branches: ["name", "created_at"],
  accesses: ["name", "created_at"],
  borrows: ["borrow_date", "due_date", "created_at", "amount_paid"],
  requests: ["created_at", "request_date"],
  categories: ["created_at", "name"],
};