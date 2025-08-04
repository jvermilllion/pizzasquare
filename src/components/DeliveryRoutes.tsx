import React from 'react';
import { Clock, MapPin, Package, CheckCircle, Archive, RotateCcw } from 'lucide-react';
import { Order } from '../types/orders';
import { formatDistanceToNow, format } from 'date-fns';

interface DeliveryRoutesProps {
  orders: Order[];
  businessLocation: { name: string; address: string; lat: number; lng: number };
  selectedOrder?: Order | null;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOrderSelect: (order: Order | null) => void;
  onArchiveOrder?: (orderId: string) => void;
  onUnarchiveOrder?: (orderId: string) => void;
  onMoveOrderBetweenRoutes?: (orderId: string, fromRouteIndex: number, toRouteIndex: number) => void;
  onMoveOrderToQueue?: (orderId: string) => void;
  showArchived?: boolean;
}

export const DeliveryRoutes: React.FC<DeliveryRoutesProps> = ({ 
  orders, 
  selectedOrder,
  onUpdateOrderStatus, 
  onOrderSelect,
  onArchiveOrder,
  onUnarchiveOrder,
  showArchived = false
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
        <p>{showArchived ? 'No archived orders' : 'No active orders found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className={`border rounded-lg p-3 ${
        showArchived 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={`font-medium ${
              showArchived ? 'text-gray-900' : 'text-blue-900'
            }`}>
              {orders.length} {showArchived ? 'Archived' : 'Active'} Orders
            </span>
            <span className={showArchived ? 'text-gray-700' : 'text-blue-700'}>
              ${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)} Total
            </span>
          </div>
          <Package className={`w-5 h-5 ${
            showArchived ? 'text-gray-600' : 'text-blue-600'
          }`} />
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
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : order.archived 
                    ? 'border-gray-300 opacity-75' 
                    : 'border-gray-200'
              }`}
              onClick={() => onOrderSelect(isSelected ? null : order)}
            >
              <div className="p-3">
                {/* Status Badge */}
                {showArchived && (
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Archived {order.archivedAt ? format(new Date(order.archivedAt), 'MMM d, h:mm a') : ''}
                    </div>
                  </div>
                )}
                
                {/* Customer Name */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-left">{order.customerName}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-mono">#{order.squareOrderId}</span>
                    <span className="text-lg font-bold text-gray-900">${order.totalAmount.toFixed(2)}</span>
                  </div>
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
                
                {/* Action Buttons */}
                {!showArchived && !order.archived && (order.status === 'delivered' || order.status === 'cancelled') && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveOrder?.(order.id);
                      }}
                      className="flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Archive className="w-3 h-3 mr-1" />
                      Archive
                    </button>
                  </div>
                )}
                
                {!showArchived && !order.archived && (order.status === 'ready' || order.status === 'out_for_delivery') && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                    <div className="flex space-x-1">
                      {order.status === 'ready' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOrderStatus(order.id, 'out_for_delivery');
                          }}
                          className="flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Out for Delivery
                        </button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateOrderStatus(order.id, 'delivered');
                          }}
                          className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Delivered
                        </button>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveOrder?.(order.id);
                      }}
                      className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Archive className="w-3 h-3 mr-1" />
                      Archive
                    </button>
                  </div>
                )}

                {showArchived && order.archived && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnarchiveOrder?.(order.id);
                      }}
                      className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};