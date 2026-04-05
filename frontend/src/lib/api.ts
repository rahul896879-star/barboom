import Constants from "expo-constants";

import type {
  AdminDashboardResponse,
  Bill,
  CollectionItem,
  Delivery,
  LoginResponse,
  Product,
  Promotion,
  SalesmanCatalogResponse,
  StaffDashboardResponse,
  UserProfile,
} from "../types";

const configBackendUrl =
  (Constants.expoConfig?.extra?.backendUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "";

const API_BASE = `${configBackendUrl.replace(/\/$/, "")}/api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(data.detail || "Request failed");
  }
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) => request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getAdminDashboard: (period: "daily" | "monthly") => request<AdminDashboardResponse>(`/admin/dashboard?period=${period}`),
  listUsers: (role?: "staff" | "salesman") => request<UserProfile[]>(role ? `/admin/users?role=${role}` : "/admin/users"),
  toggleUserStatus: (userId: string) => request<UserProfile>(`/admin/users/${userId}/status`, { method: "PATCH" }),
  listProducts: () => request<Product[]>("/admin/products"),
  listPromotions: () => request<Promotion[]>("/admin/promotions"),
  getStaffDashboard: () => request<StaffDashboardResponse>("/staff/dashboard"),
  advanceDeliveryStatus: (deliveryId: string) => request<Delivery>(`/staff/deliveries/${deliveryId}/status`, { method: "PATCH" }),
  updateDeliveryExpense: (deliveryId: string, amount: number) => request<Delivery>(`/staff/deliveries/${deliveryId}/expense`, { method: "POST", body: JSON.stringify({ amount }) }),
  acceptCollection: (collectionId: string) => request<CollectionItem>(`/staff/collections/${collectionId}/accept`, { method: "POST" }),
  getSalesmanCatalog: (salesmanId: string) => request<SalesmanCatalogResponse>(`/salesman/catalog?salesman_id=${salesmanId}`),
  getSalesmanBills: (salesmanId: string, shopName = "") => request<Bill[]>(`/salesman/bills?salesman_id=${salesmanId}&shop_name=${encodeURIComponent(shopName)}`),
  createBill: (payload: { salesman_id: string; salesman_name: string; shop_name: string; location: string; items: { product_id: string; quantity: number }[]; manual_discount: number; discount_slab_id?: string | null }) => request<Bill>("/salesman/bills", { method: "POST", body: JSON.stringify(payload) }),
};