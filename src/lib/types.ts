export type UserRole = "customer" | "factory_staff" | "admin";
export type AccountStatus = "pending" | "approved" | "suspended";
export type SignupScope = "customer" | "staff";

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
  signup_scope: SignupScope;
  debt_balance: number;
  is_owner: boolean;
  per_item_discount: number;
  /** Admin-set minimum pricing floor (quantity). 0 = no lock. */
  locked_floor_quantity: number;
  created_at: string;
  updated_at: string;
};

export type PriceTier = {
  min_quantity: number;
  discount_amount: number;
};

/** product_id → per-unit special discount for the signed-in customer. */
export type ProductDiscountMap = Record<string, number>;

export type PriceProgramStatus = {
  /** Effective floor = max(rolling 2-month floor, admin lock). */
  floor_quantity: number;
  month_quantity: number;
  /** Floor earned by the rolling two-month purchase volume. */
  rolling_floor_quantity: number;
  /** Admin-set locked floor (0 = no lock). */
  locked_floor_quantity: number;
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
  tiers?: PriceTier[] | null;
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
