export type MenuCategory = "starters" | "mains" | "desserts" | "drinks";

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  stock: number;
}

export interface OrderLine {
  id: string;
  quantity: number;
}

const CATEGORIES: MenuCategory[] = ["starters", "mains", "desserts", "drinks"];

export function validateMenuItem(item: MenuItem): string[] {
  const problems: string[] = [];
  if (item.id.trim() === "") problems.push("id is required");
  if (item.name.trim() === "") problems.push("name is required");
  if (!CATEGORIES.includes(item.category)) {
    problems.push(`category must be one of ${CATEGORIES.join(", ")}`);
  }
  if (!Number.isFinite(item.price) || item.price <= 0 || item.price > 1000) {
    problems.push(`price must be between 0 and 1000, got ${item.price}`);
  }
  if (!Number.isInteger(item.stock) || item.stock < 0 || item.stock > 100000) {
    problems.push(`stock must be an integer between 0 and 100000`);
  }
  return problems;
}

export const MENU: MenuItem[] = [
  { id: "veg-spring-roll", name: "Veg spring rolls", category: "starters", price: 6.5, stock: 40 },
  { id: "paneer-tikka", name: "Paneer tikka", category: "starters", price: 8.0, stock: 30 },
  { id: "chicken-biryani", name: "Chicken biryani", category: "mains", price: 12.0, stock: 50 },
  { id: "butter-chicken", name: "Butter chicken with rice", category: "mains", price: 14.5, stock: 35 },
  { id: "veg-thali", name: "Veg thali", category: "mains", price: 10.0, stock: 0 },
  { id: "gulab-jamun", name: "Gulab jamun", category: "desserts", price: 4.0, stock: 60 },
  { id: "mango-lassi", name: "Mango lassi", category: "drinks", price: 3.5, stock: 80 },
  { id: "masala-chai", name: "Masala chai", category: "drinks", price: 2.0, stock: 100 },
];

export function byCategory(category: MenuCategory): MenuItem[] {
  return MENU.filter((item) => item.category === category);
}

export function inStock(): MenuItem[] {
  return MENU.filter((item) => item.stock > 0);
}

export interface OrderResult {
  ok: boolean;
  total?: number;
  problem?: string;
}

export function placeOrder(lines: OrderLine[]): OrderResult {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, problem: "order must contain at least one line" };
  }
  let total = 0;
  for (const line of lines) {
    const item = MENU.find((candidate) => candidate.id === line.id);
    if (item === undefined) {
      return { ok: false, problem: `unknown menu id ${line.id}` };
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      return { ok: false, problem: `quantity for ${line.id} must be between 1 and 20` };
    }
    if (item.stock < line.quantity) {
      return { ok: false, problem: `not enough stock for ${line.id}` };
    }
    total += item.price * line.quantity;
  }
  return { ok: true, total: Number(total.toFixed(2)) };
}