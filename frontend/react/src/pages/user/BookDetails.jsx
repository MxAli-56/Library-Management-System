import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";

const API_URL = import.meta.env.VITE_API_URL;

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [hasActiveBorrow, setHasActiveBorrow] = useState(false);
  const clickTimeRef = useRef(0);

  const isOwner = user?.stamps?.includes("view_assign_stamp") || false;

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await api.get(`/book/${id}`);
        setBook(res.data.data);
      } catch (error) {
        toast.error("Book not found");
        navigate("/dashboard/books");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id, navigate]);

  useEffect(() => {
    const checkActiveBorrow = async () => {
      if (!user) return;
      try {
        const res = await api.get("/borrow/my-active");
        setHasActiveBorrow(res.data.hasActiveBorrow);
      } catch (error) {
        console.error(error);
      }
    };
    checkActiveBorrow();
  }, [user]);

  const handleBorrow = async () => {
    const now = Date.now();
    if (now - clickTimeRef.current < 2000) return;
    clickTimeRef.current = now;

    if (!user) {
      toast.error("Please login to borrow books");
      return;
    }
    if (!user.hasMembership) {
      toast.error("You need an active membership to borrow books");
      return;
    }
    if (book.quantity <= 0) {
      toast.error("Book is out of stock");
      return;
    }

    setBorrowing(true);
    try {
      const res = await api.post("/borrow/create", { book_name: book.name });
      toast.success("Book borrowed successfully!");
      setBook({ ...book, quantity: res.data.data.quantity });
      setHasActiveBorrow(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to borrow book");
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Book not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate("/dashboard/books")}
        className="text-blue-600 hover:underline mb-4"
      >
        ← Back to Books
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-56 shrink-0">
            <div className="w-full aspect-3/4 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden border">
              {book.cover_image ? (
                <img
                  src={`${API_URL}/uploads/covers/${book.cover_image}`}
                  alt={book.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-20 h-20 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">{book.name}</h1>
            <p className="text-gray-600 mt-2">by {book.author}</p>
            <p className="text-gray-500 mt-1">ISBN: {book.isbn}</p>

            {book.category && (
              <span className="inline-block mt-2 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                {book.category}
              </span>
            )}

            <div className="mt-4 space-y-2">
              <div>
                <p className="text-sm text-gray-500">Borrow Price</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${book.borrow_price}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Price</p>
                <p className="text-lg font-semibold text-gray-800">
                  ${book.total_price}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Available: {book.quantity} copies
              </p>
            </div>
          </div>

          {!isOwner && (
            <div className="flex flex-col gap-3 min-w-50">
              {!user.hasMembership ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-yellow-800">
                    Buy an active membership physically to borrow books.
                  </p>
                  <button
                    onClick={() => navigate("/dashboard/membership")}
                    className="mt-3 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition text-sm"
                  >
                    View Membership Plans
                  </button>
                </div>
              ) : hasActiveBorrow ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-orange-800">
                    You already have an active borrow. Please return it first.
                  </p>
                  <button
                    onClick={() => navigate("/dashboard/my-borrows")}
                    className="mt-3 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition text-sm"
                  >
                    View My Borrows
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-700">
                    Visit the library to borrow this book.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetails;