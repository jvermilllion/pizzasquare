import { Order } from '../types/orders';

export const restaurantLocation = {
  name: "Square Bistro",
  address: "123 Main Street, Middletown, CT 06457",
  lat: 41.5623,
  lng: -72.6509
};

// Sample order data for development
export const mockOrders: Order[] = [
  {
    id: "1",
    squareOrderId: "sq_001",
    customerName: "Sarah Johnson",
    customerPhone: "(860) 555-0123",
    items: [
      { name: "Margherita Pizza", quantity: 1, price: 18.99 },
      { name: "Caesar Salad", quantity: 1, price: 12.99 }
    ],
    totalAmount: 31.98,
    status: "ready",
    priority: "high",
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    deliveryAddress: "456 Oak Street, Middletown, CT 06457",
    deliveryLocation: { lat: 41.5598, lng: -72.6442 },
    paymentMethod: "Square",
    orderSource: "app",
    specialInstructions: "Ring doorbell twice",
    distance: "1.2 mi"
  },
  {
    id: "2", 
    squareOrderId: "sq_002",
    customerName: "Mike Chen",
    customerPhone: "(860) 555-0124",
    items: [
      { name: "Pepperoni Pizza", quantity: 2, price: 19.99 },
      { name: "Garlic Bread", quantity: 1, price: 6.99 }
    ],
    totalAmount: 46.97,
    status: "preparing",
    priority: "medium",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    deliveryAddress: "789 Pine Avenue, Middletown, CT 06457", 
    deliveryLocation: { lat: 41.5645, lng: -72.6523 },
    paymentMethod: "Square",
    orderSource: "web",
    distance: "0.8 mi"
  },
  {
    id: "3",
    squareOrderId: "sq_003", 
    customerName: "Emily Rodriguez",
    customerPhone: "(860) 555-0125",
    items: [
      { name: "Veggie Supreme Pizza", quantity: 1, price: 21.99 },
      { name: "Buffalo Wings", quantity: 1, price: 13.99 }
    ],
    totalAmount: 35.98,
    status: "pending",
    priority: "medium",
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    deliveryAddress: "321 Elm Street, Middletown, CT 06457",
    deliveryLocation: { lat: 41.5612, lng: -72.6475 },
    paymentMethod: "Square", 
    orderSource: "app",
    distance: "1.5 mi"
  },
  {
    id: "4",
    squareOrderId: "sq_004",
    customerName: "David Wilson", 
    customerPhone: "(860) 555-0126",
    items: [
      { name: "Meat Lovers Pizza", quantity: 1, price: 23.99 },
      { name: "Mozzarella Sticks", quantity: 1, price: 8.99 }
    ],
    totalAmount: 32.98,
    status: "out_for_delivery", 
    priority: "high",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    deliveryAddress: "654 Maple Drive, Middletown, CT 06457",
    deliveryLocation: { lat: 41.5589, lng: -72.6398 },
    paymentMethod: "Square",
    orderSource: "phone",
    specialInstructions: "Leave at door",
    distance: "2.1 mi"
  },
  {
    id: "5",
    squareOrderId: "sq_005",
    customerName: "Lisa Park",
    customerPhone: "(860) 555-0127", 
    items: [
      { name: "Hawaiian Pizza", quantity: 1, price: 20.99 }
    ],
    totalAmount: 20.99,
    status: "pending",
    priority: "low",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    deliveryAddress: "987 Cedar Lane, Middletown, CT 06457",
    deliveryLocation: { lat: 41.5634, lng: -72.6556 },
    paymentMethod: "Square",
    orderSource: "web", 
    distance: "1.8 mi"
  },
  {
    id: "6",
    squareOrderId: "sq_006", 
    customerName: "James Thompson",
    customerPhone: "(860) 555-0128",
    items: [
      { name: "BBQ Chicken Pizza", quantity: 1, price: 22.99 },
      { name: "Onion Rings", quantity: 1, price: 7.99 }
    ],
    totalAmount: 30.98,
    status: "ready",
    priority: "medium",
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), 
    deliveryAddress: "147 Birch Street, Middletown, CT 06457",
    deliveryLocation: { lat: 41.5656, lng: -72.6434 },
    paymentMethod: "Square",
    orderSource: "app",
    distance: "1.3 mi" 
  }
];