import { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, DollarSign, Package, Users, ArrowRight, 
  Search, AlertTriangle, Truck, Clock, CheckCircle2, XCircle, Globe, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Product, BookOrder, Customer, ActiveTab } from '../types';

interface DashboardOverviewProps {
  products: Product[];
  orders: BookOrder[];
  customers: Customer[];
  onNavigateTab: (tab: ActiveTab) => void;
}

export default function DashboardOverview({ 
  products = [], 
  orders = [], 
  customers = [], 
  onNavigateTab 
}: DashboardOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');



  const deliveredOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Delivered').length;
  }, [orders]);

  const cancelledOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Cancelled').length;
  }, [orders]);

  const returnedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Return').length;
  }, [orders]);

  // Compute key e-commerce analytics
  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Pending').length;
  }, [orders]);

  const shippedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Shipped' || o.status === 'Delivered').length;
  }, [orders]);

  // Generate last 7 days chart data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
      
      const dayStart = new Date(d.setHours(0,0,0,0)).getTime();
      const dayEnd = new Date(d.setHours(23,59,59,999)).getTime();
      
      const dayOrders = orders.filter(o => {
        const orderTime = new Date(o.orderDate || Date.now()).getTime();
        return orderTime >= dayStart && orderTime <= dayEnd;
      });
      
      const dayRevenue = dayOrders
        .filter(o => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        
      data.push({
        name: dateStr,
        orders: dayOrders.length,
        revenue: dayRevenue
      });
    }
    return data;
  }, [orders]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter(p => p.stock <= 5 || !p.isAvailable).length;
  }, [products]);

  // Filtered orders for quick overview
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        !searchTerm || 
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm) ||
        o.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusBadge = (status: BookOrder['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            pending
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            confirmed
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="h-3 w-3 mr-1" />
            by courier Shipped
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 mr-1" />
            canceled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 font-sans">


      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-between text-white relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-emerald-50 font-semibold text-xs block">Revenue</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">Tk.{totalRevenue.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-100 font-medium block">With cash on delivery</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Total Orders */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-5 rounded-2xl shadow-lg shadow-violet-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-violet-50 font-semibold text-xs block">total order</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{orders.length} t</h3>
            <span className="text-[10px] text-violet-100 font-medium block">Pending Orders: {pendingOrdersCount}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Stock / Products */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('products')}
          className={`bg-gradient-to-br ${lowStockProductsCount > 0 ? 'from-rose-500 to-red-600 shadow-rose-500/20' : 'from-indigo-500 to-purple-600 shadow-indigo-500/20'} p-5 rounded-2xl shadow-lg cursor-pointer flex items-center justify-between text-white group relative overflow-hidden`}
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className={`font-semibold text-xs block ${lowStockProductsCount > 0 ? 'text-rose-50' : 'text-indigo-50'}`}>Inventory & Stock</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{products.length} t</h3>
            <span className={`text-[10px] font-medium block ${lowStockProductsCount > 0 ? 'text-white font-bold bg-white/20 px-1.5 py-0.5 rounded inline-block mt-1' : 'text-indigo-100'}`}>
              Stock is limited/Stockout: {lowStockProductsCount} T
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <Package className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Total Customers */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('customers')}
          className="bg-gradient-to-br from-blue-500 to-cyan-500 p-5 rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-blue-50 font-semibold text-xs block">total customers</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{customers.length} John</h3>
            <span className="text-[10px] text-blue-100 font-medium block">Shipped/Delivered: {shippedOrdersCount}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <Users className="h-6 w-6 text-white" />
          </div>
        </motion.div>
      </div>

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Orders */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-amber-500 to-orange-500 p-5 rounded-2xl shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-amber-50 font-semibold text-xs block">Pending</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{pendingOrdersCount} t</h3>
            <span className="text-[10px] text-amber-100 font-medium block">Awaiting processing</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <Clock className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Delivered Product */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-green-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-green-50 font-semibold text-xs block">Delivered</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{deliveredOrdersCount} t</h3>
            <span className="text-[10px] text-green-100 font-medium block">Successful delivery completed</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Cancelled Product */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-2xl shadow-lg shadow-rose-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-rose-50 font-semibold text-xs block">Cancelled</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{cancelledOrdersCount} t</h3>
            <span className="text-[10px] text-rose-100 font-medium block">Canceled by customer/admin</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <XCircle className="h-6 w-6 text-white" />
          </div>
        </motion.div>

        {/* Returned Product */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-yellow-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-yellow-500/20 cursor-pointer flex items-center justify-between text-white group relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
          <div className="space-y-1 relative z-10">
            <span className="text-yellow-50 font-semibold text-xs block">Returned</span>
            <h3 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">{returnedOrdersCount} t</h3>
            <span className="text-[10px] text-yellow-100 font-medium block">Courier returned parcel</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/10 group-hover:rotate-6 transition-transform">
            <RefreshCw className="h-6 w-6 text-white" />
          </div>
        </motion.div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders Trend */}
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">last 7 days</h3>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">last 7 days</h3>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Tk.${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => [`Tk.${val}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content: Recent Orders List (Full Width) */}
      <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Orders</h3>
            <p className="text-[11px] text-slate-400">List of customers' latest orders</p>
          </div>
          
          <button 
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold inline-flex items-center group cursor-pointer"
          >
            View all orders ({orders.length})
            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Quick Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone or order ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="Pending">pending</option>
            <option value="Confirmed">confirmed</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">delivered</option>
            <option value="Cancelled">canceled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-y border-slate-100 text-[11px]">
                <th className="py-2.5 px-3 font-semibold">ID and date</th>
                <th className="py-2.5 px-3 font-semibold">Subscribers and mobiles</th>
                <th className="py-2.5 px-3 font-semibold">product</th>
                <th className="py-2.5 px-3 font-semibold">price</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.slice(0, 8).map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800 font-mono block">{ord.id}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(ord.createdAt).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{ord.customerName}</span>
                    <a href={`tel:${ord.phone}`} className="text-[10px] font-mono text-teal-600 hover:underline block">{ord.phone}</a>
                  </td>
                  <td className="py-3 px-3 max-w-[200px] truncate">
                    <span className="text-slate-700 block truncate" title={ord.productTitle}>{ord.productTitle}</span>
                    <span className="text-[10px] text-slate-400 block">Quantity: {ord.quantity || 1}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-600">Tk.{ord.totalPrice}</span>
                    <span className="text-[10px] text-slate-400 block">{ord.paymentMethod || 'COD'}</span>
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(ord.status)}
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No orders found। (0 T order)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
