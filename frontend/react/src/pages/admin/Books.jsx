import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { bookSchema } from "../../zod/bookZod";

const API_URL = import.meta.env.VITE_API_URL;

const Books = () => {
  const { user } = useAuth();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesList, setCategoriesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [loadingFormData, setLoadingFormData] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const canCreateBook = user?.stamps?.includes("view_create_book") || false;
  const canUpdateBook = user?.stamps?.includes("view_update_book") || false;
  const canDeleteBook = user?.stamps?.includes("view_delete_book") || false;

  const isPrivileged = user?.role === "Owner" || user?.role === "Admin";

  const userBranchIds = (user?.branches || []).map((b) => b.branch_id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(bookSchema),
  });

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (branchFilter) params.append("branch_id", branchFilter);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/book/getall?${params.toString()}`);
      setBooks(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branch/getall");
      setBranchesList(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    setLoadingFormData(true);
    try {
      const res = await api.get("/book/categories");
      setCategoriesList(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFormData(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search, category, branchFilter, sortBy, order, limit, offset]);

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAddForm = () => {
    setEditingBook(null);
    setCoverFile(null);
    reset({
      name: "",
      author: "",
      isbn: "",
      total_price: "",
      borrow_price: "",
      quantity: "",
      category_id: "",
      fine_per_day: "",
      branch_id: "",
    });
    fetchCategories();
    setShowForm(true);
  };

  const openEditForm = (b) => {
    setEditingBook(b);
    setCoverFile(null);
    fetchCategories();
    setShowForm(true);
  };

  useEffect(() => {
    if (editingBook && categoriesList.length > 0) {
      const matchedCategory = categoriesList.find(
        (c) => c.name === editingBook.category,
      );

      reset({
        name: editingBook.name,
        author: editingBook.author,
        isbn: editingBook.isbn,
        total_price: String(editingBook.total_price),
        borrow_price: String(editingBook.borrow_price),
        quantity: String(editingBook.quantity),
        category_id: matchedCategory ? String(matchedCategory.category_id) : "",
        fine_per_day: String(editingBook.fine_per_day || ""),
        branch_id: "",
      });
    }
  }, [editingBook, categoriesList, reset]);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("author", data.author);
      formData.append("isbn", data.isbn);
      formData.append("total_price", parseFloat(data.total_price));
      formData.append("borrow_price", parseFloat(data.borrow_price));
      formData.append("quantity", parseInt(data.quantity));
      formData.append("category_id", parseInt(data.category_id));
      formData.append("fine_per_day", parseFloat(data.fine_per_day));
      if (data.branch_id) {
        formData.append("branch_id", parseInt(data.branch_id));
      }
      if (coverFile) {
        formData.append("cover_image", coverFile);
      }

      if (editingBook) {
        await api.patch(`/book/update/${editingBook.book_id}`, formData);
        toast.success("Book updated successfully!");
      } else {
        await api.post("/book/create", formData);
        toast.success("Book created successfully!");
      }
      setShowForm(false);
      setEditingBook(null);
      setCoverFile(null);
      reset();
      fetchBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save book");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/book/delete/${deleteTarget.book_id}`);
      toast.success("Book deleted successfully!");
      setDeleteTarget(null);
      fetchBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const availableBranches = isPrivileged
    ? branchesList
    : branchesList.filter((b) => userBranchIds.includes(b.branch_id));

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Books</h1>
        {(canCreateBook || canUpdateBook) && (
          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Add Book
          </button>
        )}
      </div>

      {(canCreateBook || canUpdateBook) && showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">
            {editingBook ? "Edit Book" : "Add Book"}
          </h2>

          {loadingFormData ? (
            <div className="text-center py-4 text-gray-500">
              Loading form...
            </div>
          ) : (
            <>
              {editingBook &&
                isPrivileged &&
                editingBook.branch_stock &&
                editingBook.branch_stock.length > 0 && (
                  <div className="bg-gray-50 border rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium text-gray-700 mb-1">
                      Current Branch Stock:
                    </p>
                    {editingBook.branch_stock.map((s) => (
                      <div key={s.branch_id} className="flex justify-between">
                        <span className="text-gray-600">{s.branch_name}:</span>
                        <span className="font-medium">{s.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

              <div>
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Author"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("author")}
                />
                {errors.author && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.author.message}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="ISBN"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("isbn")}
                />
                {errors.isbn && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.isbn.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => setCoverFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                />
                {editingBook && editingBook.cover_image && !coverFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {editingBook.cover_image} (leave blank to keep)
                  </p>
                )}
                {coverFile && (
                  <p className="text-xs text-green-600 mt-1">
                    New file selected: {coverFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Price
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("total_price")}
                />
                {errors.total_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.total_price.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Borrow Price
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("borrow_price")}
                />
                {errors.borrow_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.borrow_price.message}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Quantity"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("category_id")}
                >
                  <option value="">Select Category</option>
                  {categoriesList.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Fine per day"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("fine_per_day")}
                />
                {errors.fine_per_day && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.fine_per_day.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("branch_id")}
                >
                  <option value="">Select Branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.branch_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.branch_id.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBook(null);
                    setCoverFile(null);
                    reset();
                  }}
                  className="bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, author, or ISBN"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
        {isPrivileged && (
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setOffset(0);
            }}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Branches</option>
            {branchesList.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="total_price-asc">Total Price (Low to High)</option>
          <option value="total_price-desc">Total Price (High to Low)</option>
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
      ) : books.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No books found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Cover
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ISBN
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Total Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Borrow Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Category
                </th>
                {(canUpdateBook || canDeleteBook) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.book_id} className="border-t">
                  <td className="px-4 py-3 text-sm">{b.book_id}</td>
                  <td className="px-4 py-3">
                    {b.cover_image ? (
                      <img
                        src={`${API_URL}/uploads/covers/${b.cover_image}`}
                        alt={b.name}
                        className="w-12 h-16 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-16 flex items-center justify-center bg-gray-100 rounded border text-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{b.name}</td>
                  <td className="px-4 py-3 text-sm">{b.author}</td>
                  <td className="px-4 py-3 text-sm">{b.isbn}</td>
                  <td className="px-4 py-3 text-sm">{b.total_price}</td>
                  <td className="px-4 py-3 text-sm">{b.borrow_price}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="relative group inline-block">
                      <span className="font-medium border-b border-dotted border-gray-400 cursor-help">
                        {b.quantity}
                      </span>
                      {b.branch_stock && b.branch_stock.length > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
                          {b.branch_stock.map((s) => (
                            <div
                              key={s.branch_id}
                              className="flex justify-between gap-4"
                            >
                              <span>{s.branch_name}:</span>
                              <span className="font-medium">{s.quantity}</span>
                            </div>
                          ))}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{b.category || "—"}</td>
                  {(canUpdateBook || canDeleteBook) && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      {canUpdateBook && (
                        <button
                          onClick={() => openEditForm(b)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteBook && (
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
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
          Page {currentPage} of {totalPages} ({total} books)
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;