import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/types/order";
import { TemperatureOption } from "@/types/menu";

interface CartState {
  items: CartItem[];
  guestToken: string | null;
  activeOrderNo: string | null;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setOrderTracking: (orderNo: string, guestToken: string) => void;
  clearOrderTracking: () => void;
  getTotalAmount: () => number;
  getTotalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      guestToken: null,
      activeOrderNo: null,

      addItem: (newItem) => {
        const cartItemId = `${newItem.menuId}-${newItem.option || "NONE"}`;
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.cartItemId === cartItemId);

        if (existingIndex > -1) {
          const updated = [...currentItems];
          const combinedQty = updated[existingIndex].quantity + newItem.quantity;
          updated[existingIndex].quantity = Math.min(combinedQty, newItem.stock);
          updated[existingIndex].stock = newItem.stock;
          set({ items: updated });
        } else {
          set({
            items: [
              ...currentItems,
              { ...newItem, cartItemId, quantity: Math.min(newItem.quantity, newItem.stock) },
            ],
          });
        }
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set({
          items: get().items.map((i) => {
            if (i.cartItemId === cartItemId) {
              return { ...i, quantity: Math.min(quantity, i.stock) };
            }
            return i;
          }),
        });
      },

      clearCart: () => set({ items: [] }),

      setOrderTracking: (orderNo, guestToken) => set({ activeOrderNo: orderNo, guestToken }),
      clearOrderTracking: () => set({ activeOrderNo: null }),

      getTotalAmount: () => get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      getTotalCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "coffee-order-guest-storage",
    }
  )
);
