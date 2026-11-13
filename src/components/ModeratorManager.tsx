import { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Shield, Check, X, Calendar, DollarSign, Award, Clock, 
  Search, Edit3, Trash2, CheckCircle2, XCircle, AlertCircle, 
  ChevronLeft, ChevronRight, Save, TrendingUp, Filter, Eye, Phone, Mail, Lock, Plus, CreditCard
} from 'lucide-react';
import { ModeratorUser, BookOrder, StaffPermission, AttendanceStatus, StaffSalaryPayment } from '../types';
import { dbService } from '../lib/dbService';

interface ModeratorManagerProps {
  moderators: ModeratorUser[];
  orders: BookOrder[];
  onRefresh: () => void;
  isRootAdmin?: boolean;
}

const AVAILABLE_PERMISSIONS: { key: StaffPermission; label: string; desc: string }[] = [
  { key: 'orders', label: 'অর্ডার ম্যানেজমেন্ট', desc: 'অর্ডার দেখা, স্ট্যাটাস পরিবর্তন, কুরিয়ার বুকিং ও প্রিন্ট' },
  { key: 'pos', label: 'POS বিক্রয় কাউন্টার', desc: 'দোকান/শোরুমের তাৎক্ষণিক ক্যাশ ও বিক্রয় চালান' },
  { key: 'inventory', label: 'ইনভেন্টরি ও স্টক', desc: 'পণ্য স্টক ব্যালেন্স, আগমন ও ট্রান্সফার ট্র্যাক' },
  { key: 'products', label: 'প্রোডাক্ট ক্যাটালগ', desc: 'নতুন পণ্য তৈরি, দাম ও বিবরণ সম্পাদনা' },
  { key: 'customers', label: 'কাস্টমার ডাটাবেজ', desc: 'গ্রাহক তথ্য ও ক্রয় ইতিহাস দেখা' },
  { key: 'coupons', label: 'ডিসকাউন্ট ও কুপন', desc: 'কুপন কোড ও প্রমোশন তৈরি' },
  { key: 'flash_sale', label: 'ফ্ল্যাশ সেল অফার', desc: 'টাইমার ভিত্তিক স্পেশাল সেল অফার' },
  { key: 'category_management', label: 'ক্যাটাগরি ও ব্র্যান্ড', desc: 'ক্যাটাগরি ও সাব-ক্যাটাগরি সাজানো' },
  { key: 'landing_setup', label: 'ল্যান্ডিং পেজ', desc: 'সিঙ্গেল প্রোডাক্ট সেলস ফানেল তৈরি' },
  { key: 'payment_settings', label: 'পেমেন্ট গেটওয়ে', desc: 'বিকাশ, নগদ ও পেমেন্ট নম্বর সেটিংস' },
  { key: 'delivery_settings', label: 'ডেলিভারি চার্জ', desc: 'ঢাকা ও ঢাকার বাইরের ডেলিভারি চার্জ নির্ধারণ' },
  { key: 'courier_settings', label: 'কুরিয়ার API', desc: 'Steadfast ও Pathao API ইন্টিগ্রেশন' },
  { key: 'pixel_settings', label: 'পিক্সেল ও ট্র্যাকিং', desc: 'Facebook Pixel ও Google Tag Manager' },
  { key: 'profile', label: 'অ্যাডমিন প্রোফাইল', desc: 'প্রোফাইল তথ্য ও সিকিউরিটি পাসওয়ার্ড' }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ModeratorManager({ moderators, orders, onRefresh, isRootAdmin = true }: ModeratorManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'payroll' | 'staff_list' | 'order_performance'>('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Month Navigation State
  const [currentDateState, setCurrentDateState] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingMod, setEditingMod] = useState<ModeratorUser | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    password: string;
    baseSalary: number;
    commissionPerOrder: number;
    isActive: boolean;
    permissions: StaffPermission[];
  }>({
    name: '',
    phone: '',
    email: '',
    password: '',
    baseSalary: 12000,
    commissionPerOrder: 15,
    isActive: true,
    permissions: ['orders', 'pos']
  });

  // Performance Tab States
  const [dateRange, setDateRange] = useState<'today' | 'last7days' | 'thismonth' | 'custom'>('thismonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Manual Attendance Entry Modal State
  const [showManualAttendanceModal, setShowManualAttendanceModal] = useState(false);
  const [manualEntryData, setManualEntryData] = useState<{
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    reason: string;
  }>({
    employeeId: moderators[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    status: 'absent',
    reason: ''
  });

  // Payroll Payment & History Modal State
  const [selectedPayrollMod, setSelectedPayrollMod] = useState<ModeratorUser | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'bKash' | 'Bank Transfer'>('bKash');
  const [paymentNote, setPaymentNote] = useState('');

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDateState(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentDateState(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleResetCurrentMonth = () => {
    const d = new Date();
    setCurrentDateState({ year: d.getFullYear(), month: d.getMonth() });
  };

  const monthLabel = `${MONTH_NAMES[currentDateState.month]} ${currentDateState.year}`;
  const selectedMonthKey = `${currentDateState.year}-${String(currentDateState.month + 1).padStart(2, '0')}`;

  // Days in selected month
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(currentDateState.year, currentDateState.month + 1, 0).getDate();
    const daysArr: { dayNum: number; dayName: string; dateStr: string; isWeekend: boolean }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentDateState.year, currentDateState.month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
      const dateStr = `${currentDateState.year}-${String(currentDateState.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArr.push({
        dayNum: d,
        dayName: dayNames[dayOfWeek],
        dateStr,
        isWeekend
      });
    }
    return daysArr;
  }, [currentDateState]);

  // Active employees for payroll and attendance
  const activeEmployees = useMemo(() => {
    return moderators.filter(m => m.isActive !== false);
  }, [moderators]);

  // Handle Save Manual Attendance Entry
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntryData.employeeId) {
      alert('অনুগ্রহ করে একজন স্টাফ নির্বাচন করুন');
      return;
    }
    await dbService.markStaffAttendance(
      manualEntryData.employeeId,
      manualEntryData.date,
      manualEntryData.status,
      manualEntryData.reason
    );
    setShowManualAttendanceModal(false);
    onRefresh();
  };

  // Quick Inline Status Cycle on Attendance Grid Cell Click
  const handleCycleAttendanceStatus = async (employeeId: string, dateStr: string, currentStatus?: AttendanceStatus) => {
    let nextStatus: AttendanceStatus;
    if (!currentStatus) nextStatus = 'present';
    else if (currentStatus === 'present') nextStatus = 'absent';
    else if (currentStatus === 'absent') nextStatus = 'leave';
    else if (currentStatus === 'leave') nextStatus = 'half_day';
    else nextStatus = 'present';

    await dbService.markStaffAttendance(employeeId, dateStr, nextStatus);
    onRefresh();
  };

  // Payroll Metrics for Selected Month
  const payrollData = useMemo(() => {
    const [selYear, selMonth] = selectedMonthKey.split('-').map(Number);
    const startOfMonth = new Date(selYear, selMonth - 1, 1);
    const endOfMonth = new Date(selYear, selMonth, 0, 23, 59, 59);

    const monthOrders = orders.filter(o => {
      const d = new Date(o.createdAt || o.orderDate || Date.now());
      return d >= startOfMonth && d <= endOfMonth;
    });

    let totalBudget = 0;
    let totalPaidThisMonth = 0;
    let totalPendingBalance = 0;

    const rows = activeEmployees.map(mod => {
      const acceptedCount = monthOrders.filter(o => 
        o.acceptedByModeratorId === mod.id || 
        (o.acceptedByModeratorName && o.acceptedByModeratorName.toLowerCase() === mod.name.toLowerCase())
      ).length;

      const baseSalary = mod.baseSalary || 0;
      const commission = acceptedCount * (mod.commissionPerOrder || 0);
      const totalDue = baseSalary + commission;

      const payments = (mod.salaryPayments || []).filter(p => p.month === selectedMonthKey);
      const paidSoFar = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
      const dueBalance = Math.max(0, totalDue - paidSoFar);

      totalBudget += totalDue;
      totalPaidThisMonth += paidSoFar;
      totalPendingBalance += dueBalance;

      return {
        moderator: mod,
        baseSalary,
        commission,
        acceptedCount,
        totalDue,
        paidSoFar,
        dueBalance,
        payments
      };
    });

    return {
      rows,
      totalBudget,
      totalPaidThisMonth,
      totalPendingBalance,
      activeCount: activeEmployees.length
    };
  }, [activeEmployees, orders, selectedMonthKey]);

  // Handle Save Payment Record
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollMod || paymentAmount <= 0) {
      alert('সঠিক পেমেন্ট অ্যামাউন্ট দিন');
      return;
    }

    const payRow = payrollData.rows.find(r => r.moderator.id === selectedPayrollMod.id);
    const totalDue = payRow?.totalDue || selectedPayrollMod.baseSalary || 0;
    const currentPaid = (payRow?.paidSoFar || 0) + paymentAmount;
    const status: 'paid' | 'unpaid' | 'partial' = currentPaid >= totalDue ? 'paid' : 'partial';

    const newPayment: Partial<StaffSalaryPayment> = {
      month: selectedMonthKey,
      paymentDate: new Date().toISOString().split('T')[0],
      baseSalary: selectedPayrollMod.baseSalary || 0,
      commissionEarned: payRow?.commission || 0,
      totalPayable: totalDue,
      amountPaid: paymentAmount,
      status,
      paymentMethod,
      note: paymentNote
    };

    await dbService.recordSalaryPayment(selectedPayrollMod.id, newPayment);
    setSelectedPayrollMod(null);
    setPaymentAmount(0);
    setPaymentNote('');
    onRefresh();
  };

  // Performance Calculations based on Selected Range
  const performanceStats = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();
    end.setHours(23, 59, 59, 999);

    if (dateRange === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'last7days') {
      start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'thismonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else {
      start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    const filteredOrders = orders.filter(o => {
      const d = new Date(o.createdAt || o.orderDate || Date.now());
      return d >= start && d <= end;
    });

    return moderators.map(mod => {
      const modOrders = filteredOrders.filter(o => 
        o.acceptedByModeratorId === mod.id ||
        (o.acceptedByModeratorName && o.acceptedByModeratorName.toLowerCase() === mod.name.toLowerCase())
      );

      const count = modOrders.length;
      const deliveredCount = modOrders.filter(o => o.status === 'Delivered').length;
      const returnCount = modOrders.filter(o => o.status === 'Return').length;
      const totalSales = modOrders.reduce((acc, o) => {
        const val = Number(o.totalAmount ?? o.totalPrice ?? (o as any).total ?? 0);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      const commRate = mod.commissionPerOrder || 0;
      const earnedCommission = count * commRate;

      return {
        moderator: mod,
        orderCount: count,
        deliveredCount,
        returnCount,
        totalSales,
        commissionEarned: earnedCommission
      };
    });
  }, [moderators, orders, dateRange, customStartDate, customEndDate]);

  // Handle Save Moderator (Add/Edit)
  const handleSaveModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('স্টাফের নাম এবং মোবাইল নম্বর আবশ্যক');
      return;
    }

    const payload: ModeratorUser = {
      id: editingMod?.id || '',
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      password: formData.password.trim() || 'staff123',
      role: 'moderator',
      permissions: formData.permissions,
      isActive: formData.isActive,
      baseSalary: Number(formData.baseSalary) || 0,
      commissionPerOrder: Number(formData.commissionPerOrder) || 0,
      attendance: editingMod?.attendance || {},
      salaryPayments: editingMod?.salaryPayments || [],
      createdAt: editingMod?.createdAt || new Date().toISOString()
    };

    await dbService.saveModerator(payload);
    setShowAddEditModal(false);
    onRefresh();
  };

  const handleOpenModal = (mod?: ModeratorUser) => {
    if (mod) {
      setEditingMod(mod);
      setFormData({
        name: mod.name,
        phone: mod.phone,
        email: mod.email || '',
        password: mod.password || '',
        baseSalary: mod.baseSalary || 0,
        commissionPerOrder: mod.commissionPerOrder || 0,
        isActive: mod.isActive !== false,
        permissions: mod.permissions || ['orders', 'pos']
      });
    } else {
      setEditingMod(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        password: '',
        baseSalary: 12000,
        commissionPerOrder: 15,
        isActive: true,
        permissions: ['orders', 'pos']
      });
    }
    setShowAddEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Sub-Tabs in Consistent Modern Slate Style */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>স্টাফ হাজিরা (Attendance)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'payroll'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>স্যালারি ও পে-রোল (Payroll)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('staff_list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'staff_list'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>স্টাফ তালিকা ({moderators.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('order_performance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'order_performance'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>পারফরমেন্স লিডারবোর্ড</span>
          </button>
        </div>

        {isRootAdmin && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-[#F7A800] hover:bg-[#e09800] text-slate-950 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন মডারেটর যোগ করুন</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE REGISTER (Clean Modern White/Slate Grid)                */}
      {/* ========================================================================= */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          {/* Header Card with Controls */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">দৈনিক হাজিরা রেজিস্টার</h2>
              </div>
              <p className="text-xs text-slate-500">
                {monthLabel} মাসের দৈনিক উপস্থিতি, ছুটি এবং অনুপস্থিতির ট্র্যাকিং শিট
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Navigator */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="পূর্ববর্তী মাস"
                  className="p-2 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-1.5 text-xs font-bold text-slate-800 tracking-tight">
                  {monthLabel}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="পরবর্তী মাস"
                  className="p-2 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Manual Entry Button */}
              <button
                type="button"
                onClick={() => {
                  setManualEntryData({
                    employeeId: activeEmployees[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    status: 'absent',
                    reason: ''
                  });
                  setShowManualAttendanceModal(true);
                }}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ম্যানুয়াল এন্ট্রি</span>
              </button>
            </div>
          </div>

          {/* Full Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs">
                    <th className="py-3 px-4 text-left font-bold text-slate-800 border-r border-slate-200 min-w-[150px] sticky left-0 bg-slate-50 z-10">
                      স্টাফ / কর্মচারী
                    </th>
                    {daysInMonth.map(day => (
                      <th
                        key={day.dateStr}
                        className={`p-1.5 border-r border-slate-100 min-w-[34px] ${
                          day.isWeekend ? 'bg-rose-50/40 text-rose-600 font-bold' : 'text-slate-600'
                        }`}
                      >
                        <div className="text-[10px] font-mono leading-none">{day.dayNum}</div>
                        <div className="text-[9px] font-medium leading-tight mt-0.5 opacity-80">{day.dayName}</div>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-[11px] font-bold text-emerald-700 border-l border-slate-200 bg-emerald-50/50 w-9">P</th>
                    <th className="py-2 px-2 text-[11px] font-bold text-rose-700 border-l border-slate-100 bg-rose-50/50 w-9">A</th>
                    <th className="py-2 px-2 text-[11px] font-bold text-blue-700 border-l border-slate-100 bg-blue-50/50 w-9">L</th>
                    <th className="py-2 px-2 text-[11px] font-bold text-amber-700 border-l border-slate-100 bg-amber-50/50 w-9">HD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEmployees.map(emp => {
                    const attendanceMap = emp.attendance || {};
                    let presentCount = 0;
                    let absentCount = 0;
                    let leaveCount = 0;
                    let halfDayCount = 0;

                    daysInMonth.forEach(day => {
                      const rec = attendanceMap[day.dateStr];
                      if (rec) {
                        if (rec.status === 'present') presentCount++;
                        else if (rec.status === 'absent') absentCount++;
                        else if (rec.status === 'leave') leaveCount++;
                        else if (rec.status === 'half_day') halfDayCount++;
                      }
                    });

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                        <td className="py-3 px-4 text-left border-r border-slate-200 sticky left-0 bg-white z-10 shadow-2xs">
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{emp.phone}</div>
                        </td>

                        {daysInMonth.map(day => {
                          const record = attendanceMap[day.dateStr];
                          const status = record?.status;

                          let badgeContent = '-';
                          let cellClass = 'text-slate-300';

                          if (status === 'present') {
                            badgeContent = 'P';
                            cellClass = 'bg-emerald-100 text-emerald-800 font-bold';
                          } else if (status === 'absent') {
                            badgeContent = 'A';
                            cellClass = 'bg-rose-100 text-rose-800 font-bold';
                          } else if (status === 'leave') {
                            badgeContent = 'L';
                            cellClass = 'bg-blue-100 text-blue-800 font-bold';
                          } else if (status === 'half_day') {
                            badgeContent = 'HD';
                            cellClass = 'bg-amber-100 text-amber-800 font-bold';
                          }

                          return (
                            <td
                              key={day.dateStr}
                              onClick={() => handleCycleAttendanceStatus(emp.id, day.dateStr, status)}
                              title={`${day.dateStr}: ${status || 'রেকর্ড নেই'} (ক্লিক করে পরিবর্তন করুন)`}
                              className={`p-1 border-r border-slate-100 text-xs font-semibold cursor-pointer select-none transition-colors hover:ring-1 hover:ring-teal-400 ${cellClass}`}
                            >
                              {badgeContent}
                            </td>
                          );
                        })}

                        <td className="py-3 px-2 font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">{presentCount}</td>
                        <td className="py-3 px-2 font-bold text-rose-700 bg-rose-50/30 border-l border-slate-100">{absentCount}</td>
                        <td className="py-3 px-2 font-bold text-blue-700 bg-blue-50/30 border-l border-slate-100">{leaveCount}</td>
                        <td className="py-3 px-2 font-bold text-amber-700 bg-amber-50/30 border-l border-slate-100">{halfDayCount}</td>
                      </tr>
                    );
                  })}

                  {activeEmployees.length === 0 && (
                    <tr>
                      <td colSpan={daysInMonth.length + 5} className="py-14 text-center">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700 mb-1">কোনো স্টাফ বা মডারেটর পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400 mb-4">হাজিরা ও স্যালারি ট্র্যাক করতে প্রথমে মডারেটর যুক্ত করুন।</p>
                        {isRootAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center gap-2 bg-[#F7A800] hover:bg-[#e09800] text-slate-950 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>প্রথম মডারেটর যুক্ত করুন</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYROLL & SALARY (Clean Modern Slate Style)                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900">পে-রোল ও বেতন বিতরণ</h2>
              </div>
              <p className="text-xs text-slate-500">
                {monthLabel} মাসের মোট বেতন, কমিশন, পরিশোধিত ও বাকি হিসাব
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-1.5 text-xs font-bold text-slate-800">
                  {monthLabel}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetCurrentMonth}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                চলতি মাস
              </button>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">সক্রিয় স্টাফ সংখ্যা</span>
              <div className="text-2xl font-black text-slate-900">{payrollData.activeCount} জন</div>
              <span className="text-[11px] text-slate-400 mt-1 block">বেতন প্রাপ্তির যোগ্য</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">মোট বেতন বাজেট</span>
              <div className="text-2xl font-black text-slate-900">৳{payrollData.totalBudget.toLocaleString()}</div>
              <span className="text-[11px] text-blue-600 font-medium mt-1 block">মূল বেতন + অর্জিত কমিশন</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">পরিশোধিত বেতন</span>
              <div className="text-2xl font-black text-emerald-600">৳{payrollData.totalPaidThisMonth.toLocaleString()}</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">চলতি মাসে বিতরিত</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 block mb-1">বকেয়া / বাকি ব্যালেন্স</span>
              <div className="text-2xl font-black text-rose-600">৳{payrollData.totalPendingBalance.toLocaleString()}</div>
              <span className="text-[11px] text-rose-600 font-medium mt-1 block">পরিশোধের অপেক্ষায়</span>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">স্টাফ / মডারেটর</th>
                    <th className="py-3 px-4 text-center">একসেপ্ট অর্ডার</th>
                    <th className="py-3 px-4 text-right">মূল বেতন</th>
                    <th className="py-3 px-4 text-right">কমিশন আয়</th>
                    <th className="py-3 px-4 text-right font-black text-slate-900">মোট প্রদেয়</th>
                    <th className="py-3 px-4 text-right text-emerald-600">পরিশোধিত</th>
                    <th className="py-3 px-4 text-right text-rose-600">বকেয়া</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollData.rows.map(row => (
                    <tr key={row.moderator.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{row.moderator.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{row.moderator.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {row.acceptedCount} টি
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        ৳{row.baseSalary.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-blue-600">
                        ৳{row.commission.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ৳{row.totalDue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        ৳{row.paidSoFar.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                        ৳{row.dueBalance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayrollMod(row.moderator);
                            setPaymentAmount(row.dueBalance > 0 ? row.dueBalance : row.totalDue);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          বেতন প্রদান / হিস্ট্রি
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payrollData.rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        কোনো স্টাফ পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF DIRECTORY & ACCESS CONTROL                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'staff_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
            {isRootAdmin && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-1.5 bg-[#F7A800] hover:bg-[#e09800] text-slate-950 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>মডারেটর যোগ করুন</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moderators
              .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm))
              .map(mod => (
                <div key={mod.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm uppercase">
                          {mod.name.slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{mod.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${mod.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className="text-[11px] text-slate-500">{mod.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                          </div>
                        </div>
                      </div>

                      {isRootAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(mod)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="সম্পাদনা"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`আপনি কি "${mod.name}" কে মুছে ফেলতে চান?`)) {
                                await dbService.deleteModerator(mod.id);
                                onRefresh();
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ফোন নম্বর:</span>
                        <span className="font-mono font-bold text-slate-800">{mod.phone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">মূল বেতন:</span>
                        <span className="font-bold text-slate-800">৳{mod.baseSalary?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">কমিশন/অর্ডার:</span>
                        <span className="font-bold text-emerald-600">৳{mod.commissionPerOrder || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">পাসওয়ার্ড:</span>
                        <span className="font-mono text-slate-700">{mod.password || '••••••'}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        অনুমোদিত ফিচার ({mod.permissions?.length || 0}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(mod.permissions || []).map(p => (
                          <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ORDER PERFORMANCE                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'order_performance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['today', 'last7days', 'thismonth', 'custom'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    dateRange === r
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'আজকে' : r === 'last7days' ? 'গত ৭ দিন' : r === 'thismonth' ? 'চলতি মাস' : 'কাস্টম'}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium"
                />
                <span className="text-slate-400">থেকে</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">স্টাফ</th>
                    <th className="py-3 px-4 text-center">একসেপ্ট অর্ডার</th>
                    <th className="py-3 px-4 text-center">ডেলিভার্ড</th>
                    <th className="py-3 px-4 text-center">রিটার্ন</th>
                    <th className="py-3 px-4 text-right">মোট সেলস ভ্যালু</th>
                    <th className="py-3 px-4 text-right">অর্জিত কমিশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {performanceStats.map(stat => (
                    <tr key={stat.moderator.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {stat.moderator.name}
                        <div className="text-[11px] font-mono text-slate-400 font-normal">{stat.moderator.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {stat.orderCount} টি
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {stat.deliveredCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-500">
                        {stat.returnCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        ৳{stat.totalSales.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                        ৳{stat.commissionEarned.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL ATTENDANCE ENTRY                                            */}
      {/* ========================================================================= */}
      {showManualAttendanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">ম্যানুয়াল হাজিরা এন্ট্রি</h2>
              <button
                type="button"
                onClick={() => setShowManualAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">স্টাফ নির্বাচন *</label>
                <select
                  value={manualEntryData.employeeId}
                  onChange={e => setManualEntryData({ ...manualEntryData, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">নির্বাচন করুন</option>
                  {activeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={manualEntryData.date}
                  onChange={e => setManualEntryData({ ...manualEntryData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">স্ট্যাটাস *</label>
                <select
                  value={manualEntryData.status}
                  onChange={e => setManualEntryData({ ...manualEntryData, status: e.target.value as AttendanceStatus })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="present">উপস্থিত (Present)</option>
                  <option value="absent">অনুপস্থিত (Absent)</option>
                  <option value="leave">ছুটি (Leave)</option>
                  <option value="half_day">হাফ ডে (Half Day)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ছুটির কারণ বা নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: অসুস্থতাজনিত ছুটি"
                  value={manualEntryData.reason}
                  onChange={e => setManualEntryData({ ...manualEntryData, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualAttendanceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYROLL DISBURSEMENT                                               */}
      {/* ========================================================================= */}
      {selectedPayrollMod && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">বেতন বিতরণ: {selectedPayrollMod.name}</h2>
                <span className="text-[11px] text-slate-400">মাস: {monthLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayrollMod(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">পরিশোধের পরিমাণ (৳) *</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-base font-bold text-emerald-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">পেমেন্ট মেথড</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="Cash">ক্যাশ (Cash)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Bank Transfer">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">নোট বা রেফারেন্স (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: bKash TrxID #8A92BC"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayrollMod(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  পেমেন্ট সম্পন্ন করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MODERATOR                                              */}
      {/* ========================================================================= */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingMod ? 'মডারেটর তথ্য সম্পাদনা' : 'নতুন মডারেটর যোগ করুন'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModerator} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">স্টাফের নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মোঃ সাকিব হাসান"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">লগইন ফোন নম্বর *</label>
                  <input
                    type="text"
                    required
                    placeholder="01XXXXXXXXX"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">লগইন পাসওয়ার্ড *</label>
                  <input
                    type="text"
                    required
                    placeholder="লগইন পাসওয়ার্ড দিন"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">মাসিক মূল বেতন (৳)</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">প্রতি অর্ডার কমিশন (৳)</label>
                  <input
                    type="number"
                    value={formData.commissionPerOrder}
                    onChange={e => setFormData({ ...formData, commissionPerOrder: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Feature Permissions */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">অনুমোদিত ফিচারসমূহ:</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {AVAILABLE_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-white cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(p.key)}
                        onChange={() => {
                          const exists = formData.permissions.includes(p.key);
                          setFormData({
                            ...formData,
                            permissions: exists ? formData.permissions.filter(x => x !== p.key) : [...formData.permissions, p.key]
                          });
                        }}
                        className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="font-semibold text-slate-700 leading-tight">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F7A800] hover:bg-[#e09800] text-slate-950 font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
