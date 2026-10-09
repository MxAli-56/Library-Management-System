import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { allocateSchema, returnSchema } from "../../zod/borrowZod";
import { useNavigate } from "react-router-dom";
import { COMPUTED_BORROW_FILTERS } from "../../config/borrowFilter";

const Borrows = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showAllocateForm, setShowAllocateForm] = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);

  const [statuses, setStatuses] = useState([]);

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [bookSearchTerm, setBookSearchTerm] = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchingBooks, setSearchingBooks] = useState(false);

  const canViewBorrow = user?.stamps?.includes("view_borrow") || false;
  const canBorrowBook = user?.stamps?.includes("view_borrow_book") || false;

  const userDebounceRef = useRef(null);
  const bookDebounceRef = useRef(null);

  const {
    register: registerAllocate,
    handleSubmit: handleSubmitAllocate,
    formState: { errors: errorsAllocate, isSubmitting: isSubmittingAllocate },
    reset: resetAllocate,
    setValue: setValueAllocate,
  } = useForm({
    resolver: zodResolver(allocateSchema),
  });

  const {
    register: registerReturn,
    handleSubmit: handleSubmitReturn,
    formState: { errors: errorsReturn, isSubmitting: isSubmittingReturn },
    reset: resetReturn,
    setValue: setValueReturn,
  } = useForm({
    resolver: zodResolver(returnSchema),
  });

  const fetchBorrows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/borrow/getall?${params.toString()}`);
      setBorrows(res.data.data);
      setTotal(res.data.pagination.total);
      if (res.data.statuses) {
        setStatuses(res.data.statuses);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrows();
  }, [search, statusFilter, sortBy, order, limit, offset]);

  useEffect(() => {
    if (!canViewBorrow) {
      navigate("/dashboard", { replace: true });
    }
  }, [canViewBorrow, navigate]);

  useEffect(() => {
    if (userDebounceRef.current) {
      clearTimeout(userDebounceRef.current);
    }

    if (!userSearchTerm || userSearchTerm.length < 2) {
      setUserResults([]);
      return;
    }

    userDebounceRef.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await api.get(
          `/staff/getallusers?search=${encodeURIComponent(userSearchTerm)}&limit=20`,
        );
        setUserResults(res.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => {
      if (userDebounceRef.current) {
        clearTimeout(userDebounceRef.current);
      }
    };
  }, [userSearchTerm]);

  useEffect(() => {
    if (bookDebounceRef.current) {
      clearTimeout(bookDebounceRef.current);
    }

    if (!bookSearchTerm || bookSearchTerm.length < 2) {
      setBookResults([]);
      return;
    }

    bookDebounceRef.current = setTimeout(async () => {
      setSearchingBooks(true);
      try {
        const res = await api.get(
          `/book/getall?search=${encodeURIComponent(bookSearchTerm)}&limit=20`,
        );
        setBookResults(res.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSearchingBooks(false);
      }
    }, 300);

    return () => {
      if (bookDebounceRef.current) {
        clearTimeout(bookDebounceRef.current);
      }
    };
  }, [bookSearchTerm]);

  useEffect(() => {
    if (!selectedBook) {
      setValueAllocate("amount_paid_allocate", "0");
      return;
    }
    const half = (parseFloat(selectedBook.borrow_price) * 0.5).toFixed(2);
    setValueAllocate("amount_paid_allocate", half);
  }, [selectedBook, setValueAllocate]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAllocateForm = () => {
    resetAllocate({ book_name: "", amount_paid_allocate: "0" });
    setUserSearchTerm("");
    setUserResults([]);
    setSelectedUser(null);
    setBookSearchTerm("");
    setBookResults([]);
    setSelectedBook(null);
    setShowAllocateForm(true);
  };

  const openReturnModal = (b) => {
    setReturnTarget(b);
    const half = (parseFloat(b.borrow_price) * 0.5).toFixed(2);
    resetReturn({
      amount_paid_return: half || "0",
    });
  };

  const onSubmitAllocate = async (data) => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }
    if (!selectedBook) {
      toast.error("Please select a book first");
      return;
    }
    try {
      await api.post("/borrow/create", {
        book_name: selectedBook.name,
        user_id: selectedUser.id,
        amount_paid_allocate: Number(data.amount_paid_allocate),
      });
      toast.success("Book allocated successfully!");
      setShowAllocateForm(false);
      resetAllocate();
      setSelectedUser(null);
      setUserSearchTerm("");
      setSelectedBook(null);
      setBookSearchTerm("");
      fetchBorrows();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to allocate book");
    }
  };

  const onSubmitReturn = async (data) => {
    if (!returnTarget) return;
    try {
      await api.patch("/borrow/return", {
        book_name: returnTarget.book_name,
        user_id: returnTarget.user_id,
        amount_paid_return: Number(data.amount_paid_return),
      });
      toast.success("Book returned successfully!");
      setReturnTarget(null);
      resetReturn();
      fetchBorrows();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to return book");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "Overdue") return "bg-red-100 text-red-800";
    if (status === "Borrowed") return "bg-blue-100 text-blue-800";
    if (status === "Returned") return "bg-green-100 text-green-800";
    if (status === "Late Returned") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Borrow Management</h1>
        {canBorrowBook && (
          <button
            onClick={openAllocateForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Allocate Book
          </button>
        )}
      </div>

      {canBorrowBook && showAllocateForm && (
        <form
          onSubmit={handleSubmitAllocate(onSubmitAllocate)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">Allocate Book</h2>

          <div className="relative">
            <input
              type="text"
              placeholder="Search user by ID, name, or email (min 2 chars)"
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setSelectedUser(null);
              }}
              disabled={!!selectedUser}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
            />
            {searchingUsers && (
              <div className="text-xs text-gray-500 mt-1">Searching...</div>
            )}
            {!selectedUser &&
              userSearchTerm.length >= 2 &&
              userResults.length > 0 && (
                <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white">
                  {userResults.map((u) => (
                    <div
                      key={u.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedUser(u);
                        setUserSearchTerm(`${u.name} (${u.email})`);
                        setUserResults([]);
                      }}
                      className="p-2 text-sm hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-500">
                        ID: {u.id} | {u.email}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            {selectedUser && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                Selected:{" "}
                <span className="font-medium">{selectedUser.name}</span> (ID:{" "}
                {selectedUser.id})
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearchTerm("");
                  }}
                  className="ml-2 text-red-600 hover:underline text-xs"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search book by name, author, or ISBN (min 2 chars)"
              value={bookSearchTerm}
              onChange={(e) => {
                setBookSearchTerm(e.target.value);
                setSelectedBook(null);
              }}
              disabled={!!selectedBook}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
            />
            {searchingBooks && (
              <div className="text-xs text-gray-500 mt-1">Searching...</div>
            )}
            {!selectedBook &&
              bookSearchTerm.length >= 2 &&
              bookResults.length > 0 && (
                <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white">
                  {bookResults.map((b) => (
                    <div
                      key={b.book_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedBook(b);
                        setBookSearchTerm(`${b.name} (${b.isbn})`);
                        setBookResults([]);
                      }}
                      className="p-2 text-sm hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-gray-500">
                        {b.author} | Available: {b.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            {selectedBook && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                Selected:{" "}
                <span className="font-medium">{selectedBook.name}</span> (
                Available: {selectedBook.quantity})
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null);
                    setBookSearchTerm("");
                  }}
                  className="ml-2 text-red-600 hover:underline text-xs"
                >
                  Clear
                </button>
              </div>
            )}
            <input
              type="hidden"
              {...registerAllocate("book_name")}
              value={selectedBook?.name || ""}
            />
            {errorsAllocate.book_name && (
              <p className="text-red-500 text-sm mt-1">
                {errorsAllocate.book_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid (50% of Borrow Price)
            </label>
            <input
              type="text"
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              {...registerAllocate("amount_paid_allocate")}
            />
            {errorsAllocate.amount_paid_allocate && (
              <p className="text-red-500 text-sm mt-1">
                {errorsAllocate.amount_paid_allocate.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmittingAllocate}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmittingAllocate ? "Allocating..." : "Allocate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAllocateForm(false);
                resetAllocate();
                setSelectedUser(null);
                setUserSearchTerm("");
                setSelectedBook(null);
                setBookSearchTerm("");
              }}
              className="bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by book, user, email, or ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s.status_id} value={s.name}>
              {s.name}
            </option>
          ))}
          {COMPUTED_BORROW_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="borrow_date-desc">Borrow Date (Newest)</option>
          <option value="borrow_date-asc">Borrow Date (Oldest)</option>
          <option value="due_date-desc">Due Date (Latest)</option>
          <option value="due_date-asc">Due Date (Earliest)</option>
          <option value="amount_paid-desc">Amount Paid (High to Low)</option>
          <option value="amount_paid-asc">Amount Paid (Low to High)</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={30}>30 per page</option>
          <option value={40}>40 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : borrows.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No borrows found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  User
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Book
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Borrowed
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Due
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Returned
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Alloc Paid
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Return Paid
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Fine
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold">
                  Status
                </th>
                {canBorrowBook && (
                  <th className="px-3 py-3 text-left text-xs font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {borrows.map((b, index) => (
                <tr
                  key={b.borrow_id}
                  className={`border-t ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="px-3 py-3 text-sm">{b.borrow_id}</td>
                  <td className="px-3 py-3 text-sm">
                    <div className="relative group inline-block cursor-help">
                      <div className="font-medium">{b.user_name}</div>
                      <div className="text-xs text-gray-500 border-b border-dotted border-gray-400">
                        {b.user_email}
                      </div>
                      {b.branch_name && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
                          Branch: {b.branch_name}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-3 py-3 text-sm max-w-45 truncate"
                    title={b.book_name}
                  >
                    {b.book_name}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {formatDate(b.borrow_date)}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {formatDate(b.due_date)}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {b.return_date ? formatDate(b.return_date) : "-"}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    ${b.amount_paid_allocate.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    ${b.amount_paid_return.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-sm">${b.fine.toFixed(2)}</td>
                  <td className="px-3 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(
                        b.status,
                      )}`}
                    >
                      {b.status}
                      {b.days_late > 0 && (
                        <span className="ml-1 opacity-75">
                          ({b.days_late}d)
                        </span>
                      )}
                    </span>
                  </td>
                  {canBorrowBook && (
                    <td className="px-3 py-3 text-sm">
                      {!b.return_date && (
                        <button
                          onClick={() => openReturnModal(b)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({total} borrows)
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {returnTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Return Book</h3>
            <p className="text-gray-600 mb-2 text-sm">
              Book:{" "}
              <span className="font-medium">{returnTarget.book_name}</span>
            </p>
            <p className="text-gray-600 mb-4 text-sm">
              User:{" "}
              <span className="font-medium">{returnTarget.user_name}</span>
            </p>
            {returnTarget.days_late > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm font-medium">
                  Fine: ${returnTarget.fine.toFixed(2)}
                </p>
                <p className="text-red-700 text-xs">
                  Days Late: {returnTarget.days_late}
                </p>
              </div>
            )}
            <form
              onSubmit={handleSubmitReturn(onSubmitReturn)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid (Remaining 50% of Borrow Price)
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                  {...registerReturn("amount_paid_return")}
                />
                {errorsReturn.amount_paid_return && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsReturn.amount_paid_return.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReturnTarget(null);
                    resetReturn();
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingReturn ? "Returning..." : "Return Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrows;