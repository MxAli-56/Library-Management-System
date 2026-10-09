import axios from 'axios'
import { getNavigate } from '../utils/navigate'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token){
        config.headers.authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      const navigate = getNavigate();
      if (navigate) {
        navigate("/login", { replace: true });
      }
    }
    return Promise.reject(error);
  },
);

export default api