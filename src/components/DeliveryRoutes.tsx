import React from 'react';
import { Clock, Phone, MapPin, Package, CheckCircle } from 'lucide-react';
import { Order } from '../types/orders';
import { formatDistanceToNow } from 'date-fns';

interface DeliveryRoutesProps {
  orders: Order[];
  businessLocation: { name: string; address: string; lat: number; lng: number };
  selectedOrder?: Order | null;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOrderSelect: (order: Order) => void;
  onArchiveRoute?: (routeId: string) => void;
  onMoveOrderBetweenRoutes?: (orderId: string, fromRouteIndex: number, toRouteIndex: number) => void;
  onMoveOrderToQueue?: (orderId: string) => void;
}

export const DeliveryRoutes: React.FC<DeliveryRoutesProps> = ({ 
  orders, 
  selectedOrder,
  onUpdateOrderStatus, 
  onOrderSelect
}) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-blue-900">{orders.length} Active Orders</span>
            <span className="text-blue-700">
              ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)} Total
            </span>
          </div>
          <Package className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* Order Queue */}
      <div className="space-y-2">
        {orders.map((order) => {
          const isSelected = selectedOrder?.id === order.id;

          return (
            <div
              key={order.id}
              className={`bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => onOrderSelect(order)}
            >
              <div className="p-3">
                {/* Customer Name */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-left">{order.customerName}</h3>
                  <span className="text-xs text-gray-500 font-mono">#{order.squareOrderId}</span>
                </div>
                
                {/* Address */}
                <div className="flex items-start text-sm text-gray-600 mb-2 text-left">
                  <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{order.deliveryAddress}</span>
                </div>
                
                {/* Order Time */}
                <div className="flex items-center text-sm text-gray-500 text-left">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};