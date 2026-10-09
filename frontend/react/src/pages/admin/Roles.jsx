import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { roleSchema } from "../../zod/roleZod";

const Roles = () => {
  const { user } = useAuth();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canViewRoles = user?.stamps?.includes("view_role") || false;
  const canCreateRole = user?.stamps?.includes("view_create_role") || false;
  const canUpdateRole = user?.stamps?.includes("view_update_role") || false;
  const canDeleteRole = user?.stamps?.includes("view_delete_role") || false;
  const canRestoreRole = user?.stamps?.includes("view_restore_role") || false;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(roleSchema),
  });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/role/getall?${params.toString()}`);
      setRoles(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [search, sortBy, order, limit, offset]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAddForm = () => {
    setEditingRole(null);
    reset({
      name: "",
    });
    setShowForm(true);
  };

  const openEditForm = (r) => {
    setEditingRole(r);
    reset({
      name: r.name,
    });
    setShowForm(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingRole) {
        await api.patch(`/role/update/${editingRole.role_id}`, {
          name: data.name,
        });
        toast.success("Role updated successfully!");
      } else {
        await api.post("/role/create", {
          name: data.name,
        });
        toast.success("Role created successfully!");
      }
      setShowForm(false);
      setEditingRole(null);
      reset();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save role");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/role/delete/${deleteTarget.role_id}`);
      toast.success("Role deleted successfully!");
      setDeleteTarget(null);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const confirmRestore = async () => {
    if (!deleteTarget) return;
    try {
      await api.patch(`/role/restore/${deleteTarget.role_id}/restore`);
      toast.success("Role restored successfully!");
      setDeleteTarget(null);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Roles</h1>
        {canCreateRole && (
          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Add Role
          </button>
        )}
      </div>

      {(canCreateRole || canUpdateRole) && showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">
            {editingRole ? "Edit Role" : "Add Role"}
          </h2>

          <div>
            <input
              type="text"
              placeholder="Name"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
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
                setEditingRole(null);
                reset();
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
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
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
      ) : roles.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No roles found</div>
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
                {(canUpdateRole || canDeleteRole) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.role_id} className="border-t">
                  <td className="px-4 py-3 text-sm">{r.role_id}</td>
                  <td className="px-4 py-3 text-sm">{r.name}</td>
                  {(canUpdateRole || canDeleteRole) && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      {canUpdateRole && (
                        <button
                          onClick={() => openEditForm(r)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteRole && (
                        <button
                          onClick={() => setDeleteTarget(r)}
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
          Page {currentPage} of {totalPages} ({total} roles)
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
            <h3 className="text-lg font-semibold mb-2">
              {deleteTarget.deleted_at ? "Confirm Restore" : "Confirm Delete"}
            </h3>
            <p className="text-gray-600 mb-4">
              {deleteTarget.deleted_at
                ? `Are you sure you want to restore "${deleteTarget.name}"?`
                : `Are you sure you want to delete "${deleteTarget.name}"?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={
                  deleteTarget.deleted_at ? confirmRestore : confirmDelete
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {deleteTarget.deleted_at ? "Restore" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
