import { Client, Environment } from 'squareup';

// Square API client configuration
const client = new Client({
  accessToken: import.meta.env.VITE_SQUARE_ACCESS_TOKEN,
  environment: import.meta.env.VITE_SQUARE_ENVIRONMENT === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

export interface SquareOrderData {
  id: string;
  locationId: string;
  orderSource: {
    name: string;
  };
  fulfillments?: Array<{
    type: string;
    state: string;
    shipmentDetails?: {
      recipient?: {
        displayName?: string;
        phoneNumber?: string;
        address?: {
          addressLine1?: string;
          addressLine2?: string;
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
    basePriceMoney: {
      amount: number;
      currency: string;
    };
    modifiers?: Array<{
      name: string;
    }>;
  }>;
  totalMoney: {
    amount: number;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
  state: string;
}

// Convert Square order to our Order format
export function convertSquareOrder(squareOrder: SquareOrderData): any {
  const fulfillment = squareOrder.fulfillments?.[0];
  const recipient = fulfillment?.shipmentDetails?.recipient;
  const address = recipient?.address;
  
  const fullAddress = [
    address?.addressLine1,
    address?.addressLine2,
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
      price: item.basePriceMoney.amount / 100, // Convert cents to dollars
      modifiers: item.modifiers?.map(mod => mod.name) || []
    })) || [],
    totalAmount: squareOrder.totalMoney.amount / 100,
    status: mapSquareStateToStatus(squareOrder.state, fulfillment?.state),
    priority: 'medium', // Default priority
    createdAt: squareOrder.createdAt,
    deliveryAddress: fullAddress,
    deliveryLocation: {
      lat: 0, // You'll need to geocode the address
      lng: 0
    },
    paymentMethod: 'Square',
    orderSource: squareOrder.orderSource.name.toLowerCase().includes('app') ? 'app' : 'web'
  };
}

// Map Square order states to our status system
function mapSquareStateToStatus(orderState: string, fulfillmentState?: string): string {
  if (fulfillmentState === 'COMPLETED') return 'delivered';
  if (fulfillmentState === 'PREPARED') return 'ready';
  if (fulfillmentState === 'RESERVED') return 'preparing';
  if (orderState === 'OPEN') return 'pending';
  return 'pending';
}

// Fetch orders from Square
export async function fetchSquareOrders(locationId: string): Promise<any[]> {
  try {
    const { result } = await client.ordersApi.searchOrders({
      locationIds: [locationId],
      query: {
        filter: {
          stateFilter: {
            states: ['OPEN', 'COMPLETED']
          },
          dateTimeFilter: {
            createdAt: {
              startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
              endAt: new Date().toISOString()
            }
          }
        },
        sort: {
          sortField: 'CREATED_AT',
          sortOrder: 'DESC'
        }
      }
    });

    return result.orders?.map(convertSquareOrder) || [];
  } catch (error) {
    console.error('Error fetching Square orders:', error);
    throw error;
  }
}

// Update order fulfillment state in Square
export async function updateSquareOrderFulfillment(
  orderId: string, 
  fulfillmentUid: string, 
  state: string
): Promise<void> {
  try {
    await client.ordersApi.updateOrder(orderId, {
      order: {
        fulfillments: [{
          uid: fulfillmentUid,
          state: state
        }]
      }
    });
  } catch (error) {
    console.error('Error updating Square order:', error);
    throw error;
  }
}

// Geocoding service to convert addresses to coordinates
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Using a free geocoding service (you might want to use Google Maps API for production)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}