import React from 'react';
import { Clock, Phone, MapPin, Package } from 'lucide-react';
import { Order } from '../types/orders';
import { formatDistanceToNow } from 'date-fns';

interface OrderListProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  selectedOrder,
  onOrderSelect,
  onUpdateOrderStatus
}) => {
  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: Order['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'out_for_delivery';
      case 'out_for_delivery': return 'delivered';
      default: return null;
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const nextStatus = getNextStatus(order.status);
        const isSelected = selectedOrder?.id === order.id;

        return (
          <div
            key={order.id}
            className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            }`}
            onClick={() => onOrderSelect(order)}
          >
            <div className="p-4">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </div>
                  <div className={`text-xs font-medium ${getPriorityColor(order.priority)}`}>
                    {order.priority.toUpperCase()} PRIORITY
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">${order.totalAmount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">#{order.squareOrderId.slice(-4)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">{order.customerName}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Phone className="w-4 h-4 mr-1" />
                  {order.customerPhone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="truncate">{order.deliveryAddress}</span>
                  <span className="ml-2 font-medium">{order.distance}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-3">
                <div className="text-sm text-gray-600">
                  {order.items.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-gray-500 text-xs mt-1">
                      +{order.items.length - 2} more items...
                    </div>
                  )}
                </div>
              </div>

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <strong className="text-yellow-800">Instructions:</strong> {order.specialInstructions}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  <span className="mx-2">•</span>
                  <span className="capitalize">{order.orderSource}</span>
                </div>
                
                {nextStatus && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateOrderStatus(order.id, nextStatus);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Mark as {getStatusLabel(nextStatus)}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};