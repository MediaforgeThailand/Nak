export type UserRole = "customer" | "factory_staff" | "admin";
export type AccountStatus = "pending" | "approved" | "suspended";

export type OrderStatus =
  | "pending_admin"
  | "approved"
  | "packing"
  | "ready_to_ship"
  | "shipping"
  | "delivered"
  | "rejected"
  | "cancelled";

export type PaymentStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  line_user_id: string | null;
  role: UserRole;
  status: AccountStatus;
  debt_balance: number;
  is_owner: boolean;
  per_item_discount: number;
};

export type Product = {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  image_path: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  category?: ProductCategory | null;
  inventory?: {
    quantity_available: number;
    low_stock_threshold: number;
  } | null;
};

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type CartItemInput = {
  product_id: string;
  quantity: number;
};
