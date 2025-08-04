import { useState, useEffect } from 'react';
import { fetchSquareOrders, geocodeAddress } from '../services/squareApi';
import { Order } from '../types/orders';

export function useSquareOrders(locationId?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!locationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const squareOrders = await fetchSquareOrders(locationId);
      
      // Geocode addresses for orders that need it
      const ordersWithCoordinates = await Promise.all(
        squareOrders.map(async (order) => {
          if (order.deliveryAddress && (!order.deliveryLocation.lat || !order.deliveryLocation.lng)) {
            const coordinates = await geocodeAddress(order.deliveryAddress);
            if (coordinates) {
              order.deliveryLocation = coordinates;
            }
          }
          return order;
        })
      );
      
      setOrders(ordersWithCoordinates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    
    // Set up polling to refresh orders every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    
    return () => clearInterval(interval);
  }, [locationId]);

  return {
    orders,
    loading,
    error,
    refetch: loadOrders
  };
}