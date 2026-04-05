export type Role = "admin" | "staff" | "salesman";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  territory: string;
};

export type LoginResponse = {
  token: string;
  user: UserProfile;
};

export type DashboardMetric = {
  label: string;
  value: string;
  caption: string;
};

export type RevenuePoint = {
  label: string;
  value: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  bulk_offer_enabled: boolean;
  bulk_offer_units?: number | null;
  bulk_offer_price?: number | null;
  stock: number;
  warehouse: string;
};

export type Promotion = {
  id: string;
  code: string;
  title: string;
  festival: string;
  discount_percent: number;
  expires_at: string;
  status: "active" | "expired";
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  created_at: string;
};

export type DiscountSlab = {
  id: string;
  label: string;
  amount: number;
  authorized_by: string;
};

export type DeliveryLine = {
  product_name: string;
  quantity: number;
};

export type Delivery = {
  id: string;
  salesman_id: string;
  salesman_name: string;
  warehouse: string;
  status: "Pending" | "Picked up" | "Delivered";
  items: DeliveryLine[];
  expense: number;
};

export type CollectionItem = {
  id: string;
  salesman_name: string;
  shop_name: string;
  amount: number;
  status: "Pending" | "Accepted";
};

export type BillLine = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Bill = {
  id: string;
  salesman_id: string;
  salesman_name: string;
  shop_name: string;
  location: string;
  items: BillLine[];
  subtotal: number;
  manual_discount: number;
  automatic_discount: number;
  automatic_discount_label?: string | null;
  authorized_by?: string | null;
  total: number;
  created_at: string;
};

export type AdminDashboardResponse = {
  metrics: DashboardMetric[];
  revenue: RevenuePoint[];
  team_preview: UserProfile[];
  promotions: Promotion[];
  inventory: Product[];
  notifications: NotificationItem[];
};

export type StaffDashboardResponse = {
  delivery_count: number;
  deliveries: Delivery[];
  collections: CollectionItem[];
  salesmen: UserProfile[];
};

export type SalesmanCatalogResponse = {
  products: Product[];
  discount_slabs: DiscountSlab[];
  history: Bill[];
};