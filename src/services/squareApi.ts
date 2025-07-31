// Minimal Square API service for production integration
export interface SquareOrderData {
  id: string;
  locationId: string;
  fulfillments?: Array<{
    type: string;
    state: string;
    shipmentDetails?: {
      recipient?: {
        displayName?: string;
        phoneNumber?: string;
        address?: {
          addressLine1?: string;
          locality?: string;
          administrativeDistrictLevel1?: string;
          postalCode?: string;
        };
      };
    };
  }>;
  lineItems?: Array<{
    name: string;
    quantity: string;
    basePriceMoney: { amount: number; currency: string };
  }>;
  totalMoney: { amount: number; currency: string };
  createdAt: string;
  state: string;
}

export function convertSquareOrder(squareOrder: SquareOrderData): any {
  const fulfillment = squareOrder.fulfillments?.[0];
  const recipient = fulfillment?.shipmentDetails?.recipient;
  const address = recipient?.address;
  
  const fullAddress = [
    address?.addressLine1,
    address?.locality,
    address?.administrativeDistrictLevel1,
    address?.postalCode
  ].filter(Boolean).join(', ');

  return {
    id: `square_${squareOrder.id}`,
    squareOrderId: squareOrder.id,
    customerName: recipient?.displayName || 'Unknown Customer',
    customerPhone: recipient?.phoneNumber || '',
    items: squareOrder.lineItems?.map(item => ({
      name: item.name,
      quantity: parseInt(item.quantity),
      price: item.basePriceMoney.amount / 100,
    })) || [],
    totalAmount: squareOrder.totalMoney.amount / 100,
    status: 'pending',
    priority: 'medium',
    createdAt: squareOrder.createdAt,
    deliveryAddress: fullAddress,
    deliveryLocation: { lat: 0, lng: 0 },
    paymentMethod: 'Square',
    orderSource: 'app'
  };
}

export async function fetchSquareOrders(locationId: string): Promise<any[]> {
  console.warn('Square API requires backend integration');
  return [];
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}