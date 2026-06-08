import { MenuItem, OrderItem, OrderStation } from "../types";

export function routeCategory(category: MenuItem["category"]): OrderStation {
  return category === "Drinks" ? "bar" : "kitchen";
}

export function splitItemsByStation(items: OrderItem[]) {
  const kitchen: OrderItem[] = [];
  const bar: OrderItem[] = [];
  for (const item of items) {
    if (routeCategory(item.menuItem.category) === "bar") {
      bar.push(item);
    } else {
      kitchen.push(item);
    }
  }
  return { kitchen, bar };
}

export function calcStationTotals(items: OrderItem[], discountRatio = 0) {
  const rawSubtotal = items.reduce((t, i) => t + i.menuItem.price * i.quantity, 0);
  const subtotal = parseFloat((rawSubtotal * (1 - discountRatio)).toFixed(2));
  const tax = parseFloat((subtotal * 0.15).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  return { subtotal, tax, total };
}

export function resolveOrderStation(order: { station?: OrderStation; items: OrderItem[] }): OrderStation {
  if (order.station) return order.station;
  const hasDrinks = order.items.some((i) => i.menuItem.category === "Drinks");
  const hasFood = order.items.some((i) => i.menuItem.category !== "Drinks");
  if (hasDrinks && !hasFood) return "bar";
  return "kitchen";
}

export function kitchenItemsOnly(items: OrderItem[]) {
  return items.filter((i) => routeCategory(i.menuItem.category) === "kitchen");
}

export function barItemsOnly(items: OrderItem[]) {
  return items.filter((i) => routeCategory(i.menuItem.category) === "bar");
}
