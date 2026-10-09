import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { userSchema } from "../../zod/userZod";

const Users = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewableRoles, setViewableRoles] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [rolesList, setRolesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedBranchIds, setSelectedBranchIds] = useState([]);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef(null);

  const isOwner = user?.stamps?.includes("view_assign_stamp") || false;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(userSchema),
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/staff/getallusers?${params.toString()}`);
      setUsers(res.data.data);
      setTotal(res.data.pagination.total);
      setViewableRoles(res.data.viewableRoles || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    if (!isOwner) return;
    setLoadingFormData(true);
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        api.get("/role/getall"),
        api.get("/branch/getall"),
      ]);
      setRolesList(rolesRes.data.data || []);
      setBranchesList(branchesRes.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFormData(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, sortBy, order, limit, offset]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(e.target)
      ) {
        setBranchDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAddForm = () => {
    setEditingUser(null);
    setSelectedBranchIds([]);
    setBranchDropdownOpen(false);
    reset({ name: "", email: "", role_id: "" });
    fetchFormData();
    setShowForm(true);
  };

  const openEditForm = (u) => {
    setEditingUser(u);
    setSelectedBranchIds(u.branch_ids || []);
    setBranchDropdownOpen(false);
    fetchFormData();
    setShowForm(true);
  };

  useEffect(() => {
    if (editingUser && rolesList.length > 0) {
      const matchedRole = rolesList.find((r) =>
        editingUser.roles.includes(r.name),
      );

      reset({
        name: editingUser.name,
        email: editingUser.email || "",
        role_id: matchedRole ? String(matchedRole.role_id) : "",
      });
    }
  }, [editingUser, rolesList, reset]);

  const toggleBranch = (branchId) => {
    setSelectedBranchIds((prev) => {
      if (prev.includes(branchId)) {
        return prev.filter((id) => id !== branchId);
      } else {
        return [...prev, branchId];
      }
    });
  };

  const onSubmit = async (data) => {
    if (selectedBranchIds.length === 0) {
      toast.error("Please select at least one branch");
      return;
    }

    try {
      if (editingUser) {
        await api.patch(`/staff/updateuser/${editingUser.id}`, {
          name: data.name,
          email: data.email,
          role_ids: [parseInt(data.role_id)],
          branch_ids: selectedBranchIds,
        });
        toast.success("User updated successfully!");
      } else {
        await api.post("/staff/insert", {
          name: data.name,
          email: data.email,
          role_id: parseInt(data.role_id),
          branch_ids: selectedBranchIds,
        });
        toast.success("User created successfully!");
      }
      setShowForm(false);
      setEditingUser(null);
      setSelectedBranchIds([]);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save user");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/staff/deleteuser/${deleteTarget.id}`);
      toast.success("User deleted successfully!");
      setDeleteTarget(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  const selectedBranchNames = branchesList
    .filter((b) => selectedBranchIds.includes(b.branch_id))
    .map((b) => b.name);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        {isOwner && (
          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Add User
          </button>
        )}
      </div>

      {isOwner && showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">
            {editingUser ? "Edit User" : "Add User"}
          </h2>

          {loadingFormData ? (
            <div className="text-center py-4 text-gray-500">
              Loading form...
            </div>
          ) : (
            <>
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
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  {...register("role_id")}
                >
                  <option value="">Select Role</option>
                  {rolesList.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {errors.role_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.role_id.message}
                  </p>
                )}
              </div>

              <div ref={branchDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branches
                </label>
                <button
                  type="button"
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  className="w-full px-3 py-2 border rounded-lg text-left bg-white hover:bg-gray-50 flex justify-between items-center"
                >
                  <span className="truncate">
                    {selectedBranchNames.length > 0
                      ? selectedBranchNames.join(", ")
                      : "Select Branches"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {branchDropdownOpen && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {branchesList.map((b) => (
                      <div
                        key={b.branch_id}
                        onClick={() => toggleBranch(b.branch_id)}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBranchIds.includes(b.branch_id)}
                          onChange={() => {}}
                          className="w-4 h-4 pointer-events-none"
                        />
                        <span className="text-sm">{b.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedBranchIds.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select at least one branch
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
                    setEditingUser(null);
                    setSelectedBranchIds([]);
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
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Roles</option>
          {viewableRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
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
      ) : users.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No users found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Branches
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Membership
                </th>
                {isOwner && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{u.id}</td>
                  <td className="px-4 py-3 text-sm">{u.name}</td>
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3 text-sm">{u.roles.join(", ")}</td>
                  <td className="px-4 py-3 text-sm">
                    {u.branches.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.membership }
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => openEditForm(u)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
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
          Page {currentPage} of {totalPages} ({total} users)
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

export default Users;