import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const isOverdue = (borrow) => {
  return borrow.return_date === null && new Date(borrow.due_date) < new Date();
};

const getDaysOverdue = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffInMs = today - due;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffInDays);
};

const calculateFine = (dueDate, finePerDay) => {
  return getDaysOverdue(dueDate) * finePerDay;
};

const MyBorrows = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchBorrows = async () => {
    setLoading(true);
    try {
      const res = await api.get("/borrow/my-borrows");
      setBorrows(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrows();
  }, []);

  if (!user?.hasMembership) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">
            Visit the library to buy an active membership to borrow book.
          </p>
          <button
            onClick={() => navigate("/dashboard/membership")}
            className="mt-4 bg-yellow-600 text-white py-2 px-6 rounded-lg hover:bg-yellow-700 transition"
          >
            View Membership Plans
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const filteredBorrows = borrows.filter((borrow) => {
    if (filter === "All") return true;
    if (filter === "Active")
      return borrow.return_date === null && !isOverdue(borrow);
    if (filter === "Returned") return borrow.return_date !== null;
    if (filter === "Overdue") return isOverdue(borrow);
    return true;
  });

  const filterTabs = ["All", "Active", "Returned", "Overdue"];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Borrows</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filteredBorrows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            No {filter !== "All" ? filter.toLowerCase() : ""} borrows found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBorrows.map((borrow) => {
            const overdue = isOverdue(borrow);
            const daysOverdue = overdue ? getDaysOverdue(borrow.due_date) : 0;
            const fine = overdue
              ? calculateFine(borrow.due_date, borrow.fine_per_day)
              : 0;

            let statusText = "Active";
            let statusClass = "bg-blue-100 text-blue-700";
            if (borrow.return_date !== null) {
              statusText = "Returned";
              statusClass = "bg-green-100 text-green-700";
            } else if (overdue) {
              statusText = "Overdue";
              statusClass = "bg-red-100 text-red-700";
            }

            return (
              <div
                key={borrow.borrow_id}
                className="bg-white rounded-lg shadow p-5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {borrow.book_name}
                    </h3>
                    <p className="text-sm text-gray-600">by {borrow.author}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}
                  >
                    {statusText}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  <p>
                    <span className="font-medium">Borrowed:</span>{" "}
                    {new Date(borrow.borrow_date).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Due:</span>{" "}
                    {new Date(borrow.due_date).toLocaleDateString()}
                  </p>
                  {borrow.return_date && (
                    <p>
                      <span className="font-medium">Returned:</span>{" "}
                      {new Date(borrow.return_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {overdue && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-red-800 text-sm font-medium">
                      Fine Amount: ${fine.toFixed(2)}
                    </p>
                    <p className="text-red-700 text-sm">
                      Days Overdue: {daysOverdue}{" "}
                      {daysOverdue === 1 ? "day" : "days"}
                    </p>
                  </div>
                )}

                {borrow.return_date === null && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-700 text-sm">
                      Visit the library to return this book.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBorrows;