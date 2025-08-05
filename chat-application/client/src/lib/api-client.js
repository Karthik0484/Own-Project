import axios from "axios";
import { HOST } from "@/utils/constants";

export const apiClient = axios.create({
    baseURL: HOST,
    withCredentials: true,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

