import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// YOUR 5 PRODUCTS FOR SALE
const INVENTORY_ITEMS = [
  {
    id: "1",
    name: "iPhone 14 Pro Max",
    description: "Brand new, sealed in box",
    priceBTC: 0.025,
    priceETH: 0.45,
    priceUSDT: 800,
    available: true,
    location: "Hidden until payment confirmed",
  },
  {
    id: "2",
    name: "MacBook Air M2",
    description: "2023 model, 256GB, Space Gray",
    priceBTC: 0.035,
    priceETH: 0.65,
    priceUSDT: 1100,
    available: true,
    location: "Hidden until payment confirmed",
  },
  {
    id: "3",
    name: "AirPods Pro 2",
    description: "Latest generation with USB-C",
    priceBTC: 0.007,
    priceETH: 0.12,
    priceUSDT: 220,
    available: true,
    location: "Hidden until payment confirmed",
  },
  {
    id: "4",
    name: "PlayStation 5",
    description: "Disc Edition, includes 2 controllers",
    priceBTC: 0.015,
    priceETH: 0.28,
    priceUSDT: 480,
    available: true,
    location: "Hidden until payment confirmed",
  },
  {
    id: "5",
    name: "Samsung Galaxy S24 Ultra",
    description: "512GB, Titanium Black",
    priceBTC: 0.03,
    priceETH: 0.55,
    priceUSDT: 950,
    available: true,
    location: "Hidden until payment confirmed",
  },
];

// YOUR CRYPTO WALLETS - WHERE PEOPLE SEND MONEY
const CRYPTO_WALLETS = {
  BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  USDT: "TN2A3x5pJjT5KxWMHJLsxCq2Rn8SKDJPVA",
};

// STORE ORDERS HERE
const pendingOrders: Map<string, any> = new Map();

// TOOL 1: SHOW ALL ITEMS
export const listItemsTool = createTool({
  id: "list-marketplace-items",
  description: "Show customer all items available to buy",
  inputSchema: z.object({
    _placeholder: z.string().optional(),
  }),
  outputSchema: z.object({
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      priceBTC: z.number(),
      priceETH: z.number(),
      priceUSDT: z.number(),
      available: z.boolean(),
    })),
    message: z.string(),
  }),
  execute: async ({ mastra }) => {
    const availableItems = INVENTORY_ITEMS.filter((item) => item.available);
    return {
      items: availableItems,
      message: `Found ${availableItems.length} items available for purchase`,
    };
  },
});

// TOOL 2: SHOW DETAILS OF ONE ITEM
export const getItemDetailsTool = createTool({
  id: "get-item-details",
  description: "Get details about one specific item",
  inputSchema: z.object({
    itemIdentifier: z.string(),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    item: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      priceBTC: z.number(),
      priceETH: z.number(),
      priceUSDT: z.number(),
      available: z.boolean(),
    }).nullable(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const searchTerm = context.itemIdentifier.toLowerCase();
    const item = INVENTORY_ITEMS.find(
      (i) => i.id === context.itemIdentifier || i.name.toLowerCase().includes(searchTerm)
    );
    
    if (!item) {
      return {
        found: false,
        item: null,
        message: `Item "${context.itemIdentifier}" not found`,
      };
    }
    
    return {
      found: true,
      item,
      message: `Found item: ${item.name}`,
    };
  },
});

// TOOL 3: CREATE AN ORDER (Person buys something)
export const createOrderTool = createTool({
  id: "create-order",
  description: "Create order when customer wants to buy something",
  inputSchema: z.object({
    itemId: z.string(),
    cryptoType: z.enum(["BTC", "ETH", "USDT"]),
    userName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    orderId: z.string().nullable(),
    itemName: z.string().nullable(),
    amount: z.number().nullable(),
    cryptoType: z.string().nullable(),
    walletAddress: z.string().nullable(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const item = INVENTORY_ITEMS.find((i) => i.id === context.itemId);
    
    if (!item || !item.available) {
      return {
        success: false,
        orderId: null,
        itemName: null,
        amount: null,
        cryptoType: null,
        walletAddress: null,
        message: "Item not found or sold out",
      };
    }
    
    const amount = context.cryptoType === "BTC" ? item.priceBTC : 
                   context.cryptoType === "ETH" ? item.priceETH : item.priceUSDT;
    
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    pendingOrders.set(orderId, {
      itemId: item.id,
      itemName: item.name,
      crypto: context.cryptoType,
      amount,
      userName: context.userName,
      status: "pending",
      location: "123 Main Street, Building A, Locker #42 - Code: 7829",
    });
    
    return {
      success: true,
      orderId,
      itemName: item.name,
      amount,
      cryptoType: context.cryptoType,
      walletAddress: CRYPTO_WALLETS[context.cryptoType],
      message: `Order created! Send ${amount} ${context.cryptoType} to: ${CRYPTO_WALLETS[context.cryptoType]}. Order ID: ${orderId}`,
    };
  },
});

// TOOL 4: CONFIRM PAYMENT (YOU confirm customer paid)
export const confirmPaymentTool = createTool({
  id: "confirm-payment",
  description: "Admin confirms payment and reveals pickup location",
  inputSchema: z.object({
    orderId: z.string(),
    adminCode: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    orderId: z.string().nullable(),
    itemName: z.string().nullable(),
    location: z.string().nullable(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    if (context.adminCode !== "ADMIN2024") {
      return {
        success: false,
        orderId: null,
        itemName: null,
        location: null,
        message: "Wrong admin code! Only owner can confirm payments.",
      };
    }
    
    const order = pendingOrders.get(context.orderId);
    if (!order) {
      return {
        success: false,
        orderId: null,
        itemName: null,
        location: null,
        message: "Order not found",
      };
    }
    
    order.status = "confirmed";
    const item = INVENTORY_ITEMS.find((i) => i.id === order.itemId);
    if (item) item.available = false;
    
    return {
      success: true,
      orderId: context.orderId,
      itemName: order.itemName,
      location: order.location,
      message: `Payment confirmed! Pickup at: ${order.location}`,
    };
  },
});

// TOOL 5: CHECK ORDER STATUS
export const checkOrderStatusTool = createTool({
  id: "check-order-status",
  description: "Check if order is paid or waiting",
  inputSchema: z.object({
    orderId: z.string(),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    status: z.string().nullable(),
    itemName: z.string().nullable(),
    location: z.string().nullable(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const order = pendingOrders.get(context.orderId);
    
    if (!order) {
      return {
        found: false,
        status: null,
        itemName: null,
        location: null,
        message: "Order not found",
      };
    }
    
    return {
      found: true,
      status: order.status,
      itemName: order.itemName,
      location: order.status === "confirmed" ? order.location : null,
      message: order.status === "confirmed" 
        ? `Order confirmed! Pickup at: ${order.location}`
        : `Order waiting... Admin needs to confirm payment.`,
    };
  },
});

// TOOL 6: SHOW PAYMENT INFO
export const getPaymentInfoTool = createTool({
  id: "get-payment-info",
  description: "Show accepted cryptocurrencies and wallet addresses",
  inputSchema: z.object({
    _placeholder: z.string().optional(),
  }),
  outputSchema: z.object({
    acceptedCrypto: z.array(z.string()),
    wallets: z.record(z.string()),
    message: z.string(),
  }),
  execute: async () => {
    return {
      acceptedCrypto: ["BTC", "ETH", "USDT"],
      wallets: CRYPTO_WALLETS,
      message: "We accept Bitcoin, Ethereum, and Tether",
    };
  },
});
