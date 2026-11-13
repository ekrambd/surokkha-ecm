import { useState, useMemo } from 'react';
import { 
  ShoppingBag, DollarSign, Package, Users, ArrowRight, 
  Search, Truck, Clock, CheckCircle2, XCircle, RefreshCw,
  Calendar, RotateCcw, TrendingUp, Check, ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Product, BookOrder, Customer, ActiveTab } from '../types';

interface DashboardOverviewProps {
  products: Product[];
  orders: BookOrder[];
  customers: Customer[];
  onNavigateTab: (tab: ActiveTab) => void;
}

type DateFilterOption = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export default function DashboardOverview({ 
  products = [], 
  orders = [], 
  customers = [], 
  onNavigateTab 
}: DashboardOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Helper to parse order timestamp cleanly
  const getOrderTimestamp = (order: BookOrder): number => {
    const raw = order.orderDate || order.createdAt;
    if (!raw) return 0;
    const parsed = new Date(raw).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // Determine active date range boundary
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start, end };
    }

    if (dateFilter === 'this_week') {
      // Start of week (assuming Monday as start or current week Sunday/Monday)
      const dayOfWeek = now.getDay(); // 0 is Sunday
      // Let week start on Monday (or Sunday if standard 0-6): Monday = 1
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start: startDay.getTime(), end };
    }

    if (dateFilter === 'this_month') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start: startMonth, end: endMonth };
    }

    if (dateFilter === 'custom') {
      const start = customStartDate 
        ? new Date(`${customStartDate}T00:00:00`).getTime() 
        : 0;
      const end = customEndDate 
        ? new Date(`${customEndDate}T23:59:59.999`).getTime() 
        : Number.MAX_SAFE_INTEGER;
      return { start, end };
    }

    return null; // 'all' - no date bounding
  }, [dateFilter, customStartDate, customEndDate]);

  // Orders filtered by the active date range
  const dateFilteredOrders = useMemo(() => {
    if (!dateRangeBounds) return orders;
    return orders.filter(o => {
      const t = getOrderTimestamp(o);
      if (!t) return false;
      return t >= dateRangeBounds.start && t <= dateRangeBounds.end;
    });
  }, [orders, dateRangeBounds]);

  // Key metrics calculated on the date-filtered orders
  const deliveredOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Delivered').length;
  }, [dateFilteredOrders]);

  const cancelledOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Cancelled').length;
  }, [dateFilteredOrders]);

  const returnedOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Return').length;
  }, [dateFilteredOrders]);

  const pendingOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Pending').length;
  }, [dateFilteredOrders]);

  const confirmedOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Confirmed' || o.status === 'Approved').length;
  }, [dateFilteredOrders]);

  const shippedOrdersCount = useMemo(() => {
    return dateFilteredOrders.filter(o => o.status === 'Shipped').length;
  }, [dateFilteredOrders]);

  // Total sales revenue: exclude Cancelled / Return orders
  const totalRevenue = useMemo(() => {
    return dateFilteredOrders
      .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
      .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);
  }, [dateFilteredOrders]);

  // Unique customers active in this period (or based on total customer database)
  const activeCustomersCount = useMemo(() => {
    if (dateFilter === 'all') return customers.length;
    const customerPhones = new Set<string>();
    dateFilteredOrders.forEach(o => {
      if (o.phone) customerPhones.add(o.phone);
    });
    return customerPhones.size;
  }, [customers, dateFilteredOrders, dateFilter]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter(p => (typeof p.stock === 'number' && p.stock <= 5) || p.isAvailable === false).length;
  }, [products]);

  // Dynamic Chart Data adapted to the selected date range
  const chartData = useMemo(() => {
    // 1. If Today: break down by hours (00:00 to 23:00)
    if (dateFilter === 'today') {
      const now = new Date();
      const currentHour = now.getHours();
      const points = [];
      for (let h = 0; h <= 23; h += 3) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 2, 59, 59, 999).getTime();

        const slotOrders = dateFilteredOrders.filter(o => {
          const t = getOrderTimestamp(o);
          return t >= start && t <= end;
        });

        const rev = slotOrders
          .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
          .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);

        points.push({
          name: `${h.toString().padStart(2, '0')}:00`,
          orders: slotOrders.length,
          revenue: rev
        });
      }
      return points;
    }

    // 2. If This Week: 7 days of the current week (Monday to Sunday)
    if (dateFilter === 'this_week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);

      const days = [];
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
        const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

        const dayOrders = dateFilteredOrders.filter(o => {
          const t = getOrderTimestamp(o);
          return t >= dayStart && t <= dayEnd;
        });

        const rev = dayOrders
          .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
          .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);

        days.push({
          name: `${dayNames[i]} (${d.getDate()})`,
          orders: dayOrders.length,
          revenue: rev
        });
      }
      return days;
    }

    // 3. If This Month: 4 weekly blocks or 5-day intervals
    if (dateFilter === 'this_month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const points = [];
      const step = 5;

      for (let startDay = 1; startDay <= daysInMonth; startDay += step) {
        const endDay = Math.min(startDay + step - 1, daysInMonth);
        const start = new Date(now.getFullYear(), now.getMonth(), startDay, 0, 0, 0, 0).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999).getTime();

        const rangeOrders = dateFilteredOrders.filter(o => {
          const t = getOrderTimestamp(o);
          return t >= start && t <= end;
        });

        const rev = rangeOrders
          .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
          .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);

        points.push({
          name: `${startDay}-${endDay} ${now.toLocaleString('en-US', { month: 'short' })}`,
          orders: rangeOrders.length,
          revenue: rev
        });
      }
      return points;
    }

    // 4. Custom range or All:
    if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const end = new Date(`${customEndDate}T23:59:59.999`);
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 14) {
        // Daily breakdown
        const points = [];
        for (let i = 0; i < diffDays; i++) {
          const curr = new Date(start);
          curr.setDate(start.getDate() + i);
          const dayStart = new Date(curr.setHours(0, 0, 0, 0)).getTime();
          const dayEnd = new Date(curr.setHours(23, 59, 59, 999)).getTime();

          const dayOrders = dateFilteredOrders.filter(o => {
            const t = getOrderTimestamp(o);
            return t >= dayStart && t <= dayEnd;
          });

          const rev = dayOrders
            .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
            .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);

          points.push({
            name: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            orders: dayOrders.length,
            revenue: rev
          });
        }
        return points;
      }
    }

    // Default (All): Last 7 calendar days
    const defaultPoints = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

      const dayOrders = orders.filter(o => {
        const t = getOrderTimestamp(o);
        return t >= dayStart && t <= dayEnd;
      });

      const dayRevenue = dayOrders
        .filter(o => o.status !== 'Cancelled' && o.status !== 'Return')
        .reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);

      defaultPoints.push({
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayRevenue
      });
    }
    return defaultPoints;
  }, [dateFilter, dateFilteredOrders, orders, customStartDate, customEndDate]);

  // Filtered orders for quick overview table (both date range and search/status)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const matchesSearch = 
        !searchTerm || 
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm) ||
        o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.productTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.productName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [dateFilteredOrders, searchTerm, statusFilter]);

  const getStatusBadge = (status: BookOrder['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'Confirmed':
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </span>
        );
      case 'Packaging':
      case 'Ready for Shipment':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Package className="h-3 w-3 mr-1" />
            {status}
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="h-3 w-3 mr-1" />
            Shipped
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Delivered
          </span>
        );
      case 'Return':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <RefreshCw className="h-3 w-3 mr-1" />
            Returned
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today';
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'custom':
        return customStartDate && customEndDate 
          ? `${customStartDate} → ${customEndDate}` 
          : 'Custom Range';
      default:
        return 'All Time';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Filter Bar with Today / This Week / This Month / Custom Date Range */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Dashboard Overview & Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Showing real-time data for: <span className="font-semibold text-teal-700">{getFilterLabel()}</span> ({dateFilteredOrders.length} orders)
            </p>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('this_week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'this_week'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'this_month'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('custom')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'custom'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Custom Range
            </button>

            {dateFilter !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                title="Reset Date Filter"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker inputs when dateFilter === 'custom' */}
        {dateFilter === 'custom' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-slate-50/80 p-3 rounded-xl">
            <span className="text-xs font-semibold text-slate-700">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500 font-medium">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-500 font-medium">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            {(!customStartDate || !customEndDate) && (
              <span className="text-[11px] text-amber-600 font-medium">
                * Please select both start and end date
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales / Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">
              Revenue ({getFilterLabel()})
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">৳{totalRevenue.toLocaleString()}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold block flex items-center gap-1">
              <TrendingUp className="h-3 w-3 inline" />
              Delivered: {deliveredOrdersCount} | Shipped: {shippedOrdersCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-500/10">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">
              Orders ({getFilterLabel()})
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
              {dateFilteredOrders.length.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium block">
              Pending: <strong className="text-amber-600">{pendingOrdersCount}</strong> | Confirmed: <strong className="text-blue-600">{confirmedOrdersCount}</strong>
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-4 ring-blue-500/10 group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        {/* Stock / Products */}
        <div 
          onClick={() => onNavigateTab('products')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">Inventory & Stock</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-purple-600 transition-colors">{products.length.toLocaleString()}</h3>
            <span className={`text-[11px] font-medium block ${lowStockProductsCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
              {lowStockProductsCount > 0 ? `Low Stock / Stockout: ${lowStockProductsCount}` : 'All items in stock'}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center ring-4 ring-purple-500/10 group-hover:scale-105 transition-transform">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">
              {dateFilter === 'all' ? 'Total Customers' : `Active Customers (${getFilterLabel()})`}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">
              {activeCustomersCount.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium block">
              Delivered Orders: {deliveredOrdersCount}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center ring-4 ring-sky-500/10 group-hover:scale-105 transition-transform">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Additional Order Status Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Pending Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">Pending</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">{pendingOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Awaiting processing</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-4 ring-amber-500/10 group-hover:scale-105 transition-transform">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Delivered Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">Delivered</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{deliveredOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Successful delivery</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-500/10 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Cancelled Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">Cancelled</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">{cancelledOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Canceled orders</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center ring-4 ring-rose-500/10 group-hover:scale-105 transition-transform">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Returned Orders */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider block">Returned</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-orange-600 tracking-tight">{returnedOrdersCount.toLocaleString()}</h3>
            <span className="text-[11px] text-slate-400 font-medium block">Courier returned parcel</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center ring-4 ring-orange-500/10 group-hover:scale-105 transition-transform">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders Trend */}
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">
              Orders Trend ({getFilterLabel()})
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {dateFilteredOrders.length} Total
            </span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">
              Revenue Trend ({getFilterLabel()})
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              ৳{totalRevenue.toLocaleString()} Total
            </span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height={240} minWidth={100} minHeight={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `৳${val}`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => [`৳${Number(val || 0).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content: Filtered Orders List */}
      <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Orders List ({getFilterLabel()})
            </h3>
            <p className="text-[11px] text-slate-400">
              Showing {filteredOrders.length} of {dateFilteredOrders.length} orders in this period
            </p>
          </div>
          
          <button 
            onClick={() => onNavigateTab('orders')}
            className="text-xs text-teal-600 hover:text-teal-700 font-bold inline-flex items-center group cursor-pointer"
          >
            Manage all orders in Order Manager
            <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Quick Search and Status Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name, phone, order ID or product..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Packaging">Packaging</option>
            <option value="Ready for Shipment">Ready for Shipment</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Return">Returned</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-y border-slate-100 text-[11px]">
                <th className="py-2.5 px-3 font-semibold">ID & Date</th>
                <th className="py-2.5 px-3 font-semibold">Customer & Contact</th>
                <th className="py-2.5 px-3 font-semibold">Product</th>
                <th className="py-2.5 px-3 font-semibold">Price</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.slice(0, 15).map((ord) => {
                const dateDisplay = ord.orderDate || ord.createdAt;
                const formattedDate = dateDisplay ? new Date(dateDisplay).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A';

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 font-mono block">{ord.id}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {formattedDate}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block">{ord.customerName}</span>
                      <a href={`tel:${ord.phone}`} className="text-[10px] font-mono text-teal-600 hover:underline block">{ord.phone}</a>
                      {ord.address && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[200px]" title={ord.address}>
                          {ord.address}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-[220px] truncate">
                      <span className="text-slate-700 font-medium block truncate" title={ord.productTitle || ord.productName}>
                        {ord.productTitle || ord.productName || 'Order Items'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Quantity: {ord.quantity || 1}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-emerald-600">৳{ord.totalPrice || ord.totalAmount || 0}</span>
                      <span className="text-[10px] text-slate-400 block">{ord.paymentMethod || 'COD'}</span>
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(ord.status)}
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-8 w-8 text-slate-300" />
                      <span>No orders found matching the filter ({getFilterLabel()})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter('all');
                          setSearchTerm('');
                          setStatusFilter('all');
                        }}
                        className="text-xs text-teal-600 hover:underline font-semibold mt-1 cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    </div>
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
