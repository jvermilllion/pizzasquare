export interface Order {
  id: string;
  squareOrderId: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    modifiers?: string[];
  }>;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  deliveryAddress: string;
  deliveryLocation: {
    lat: number;
    lng: number;  
  };
  paymentMethod: string;
  orderSource: 'web' | 'app' | 'phone';
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  distance?: string;
  readyTime?: string;
  pickedUpTime?: string;
  deliveredTime?: string;
  archived?: boolean;
  archivedAt?: string;
}