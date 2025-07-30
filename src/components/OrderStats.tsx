import React from 'react';
import { Clock, Package, DollarSign, TrendingUp } from 'lucide-react';
import { Order } from '../types/orders';

interface OrderStatsProps {
  orders: Order[];
}

export const OrderStats: React.FC<OrderStatsProps> = ({ orders }) => {
  const stats = React.useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const outForDelivery = orders.filter(o => o.status === 'out_for_delivery').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      pending,
      preparing,
      ready,
      outForDelivery,
      totalRevenue,
      avgOrderValue,
      totalOrders: orders.length
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <Package className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <Clock className="w-8 h-8 text-yellow-600 mr-3" />
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.pending + stats.preparing}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.ready + stats.outForDelivery}</div>
            <div className="text-sm text-gray-600">Ready/Out</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
          <div>
            <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
};