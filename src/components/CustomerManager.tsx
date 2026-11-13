import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer } from '../types';
import { dbService } from '../lib/dbService';
import { 
  Users, Search, Phone, MapPin, ShoppingBag, Calendar, MessageSquare, 
  Download, Upload, FileSpreadsheet, Plus, Check, AlertCircle, X, ChevronDown
} from 'lucide-react';
import { FeedbackDialog } from './ui/FeedbackDialog';

interface CustomerManagerProps {
  customers: Customer[];
}

export default function CustomerManager({ customers }: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      (c.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  // 1. Export Customers as Clean CSV (Excel readable with UTF-8 BOM)
  const handleExportCSV = () => {
    if (customers.length === 0) {
      setFeedback({
        isOpen: true,
        type: 'info',
        title: 'No Customers',
        message: 'There are no customer records to export.'
      });
      return;
    }

    const headers = [
      'Customer ID',
      'Name',
      'Phone Number',
      'Email',
      'Delivery Address',
      'District',
      'Total Orders',
      'Total Spent (BDT)',
      'Loyalty Points',
      'Last Order Date',
      'Registered At'
    ];

    const rows = filteredCustomers.map(c => [
      `"${c.id || ''}"`,
      `"${String(c.name || '').replace(/"/g, '""')}"`,
      `"${String(c.phone || '').replace(/"/g, '""')}"`,
      `"${String(c.email || '').replace(/"/g, '""')}"`,
      `"${String(c.address || '').replace(/"/g, '""')}"`,
      `"${String(c.district || '').replace(/"/g, '""')}"`,
      c.totalOrders || 0,
      c.totalSpent || 0,
      c.points || 0,
      `"${c.lastOrderDate ? new Date(c.lastOrderDate).toISOString() : ''}"`,
      `"${c.createdAt || c.registeredAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `customers_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedback({
      isOpen: true,
      type: 'success',
      title: 'Export Completed',
      message: `Exported ${filteredCustomers.length} customer records to CSV successfully.`
    });
  };

  // 2. Download sample CSV template for Import
  const handleDownloadSampleCSV = () => {
    const headers = ['Name', 'Phone', 'Address', 'Email', 'District', 'Total Orders', 'Total Spent'];
    const sampleRows = [
      ['"Lincon Ahmed"', '"01784067744"', '"House 12, Banasree, Dhaka"', '"lincon@example.com"', '"Dhaka"', '3', '3450'],
      ['"Tanvir Hasan"', '"01812345678"', '"GEC Circle, Chittagong"', '""', '"Chittagong"', '1', '1250']
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_customers_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Bulk Import CSV Parser & Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading and validating CSV file...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setImportStatus('File is empty.');
          setIsImporting(false);
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setImportStatus('No data rows found in CSV file.');
          setIsImporting(false);
          return;
        }

        // Header parsing & index mapping
        const headerTokens = lines[0].split(',').map(h => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());
        
        let nameIdx = headerTokens.findIndex(h => h.includes('name'));
        let phoneIdx = headerTokens.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
        let addressIdx = headerTokens.findIndex(h => h.includes('address') || h.includes('location'));
        let emailIdx = headerTokens.findIndex(h => h.includes('email'));
        let districtIdx = headerTokens.findIndex(h => h.includes('district') || h.includes('city'));
        let ordersIdx = headerTokens.findIndex(h => h.includes('order'));
        let spentIdx = headerTokens.findIndex(h => h.includes('spent') || h.includes('price') || h.includes('amount'));

        // Fallbacks if standard format
        if (nameIdx === -1 && headerTokens.length > 0) nameIdx = 0;
        if (phoneIdx === -1 && headerTokens.length > 1) phoneIdx = 1;
        if (addressIdx === -1 && headerTokens.length > 2) addressIdx = 2;

        const importedCustomers: Customer[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowText = lines[i];
          // regex to split comma separated respecting quotes
          const matches = rowText.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || rowText.split(',');
          const cols = matches.map(m => m.replace(/^["']|["']$/g, '').trim());

          const name = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : 'Customer';
          const phone = phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx].replace(/[^\d+]/g, '') : '';
          const address = addressIdx >= 0 && cols[addressIdx] ? cols[addressIdx] : '';
          const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : '';
          const district = districtIdx >= 0 && cols[districtIdx] ? cols[districtIdx] : '';
          const totalOrders = ordersIdx >= 0 && cols[ordersIdx] ? Math.max(0, parseInt(cols[ordersIdx], 10) || 0) : 0;
          const totalSpent = spentIdx >= 0 && cols[spentIdx] ? Math.max(0, parseFloat(cols[spentIdx]) || 0) : 0;

          if (phone || name) {
            importedCustomers.push({
              id: phone || `cust-${Date.now()}-${i}`,
              name,
              phone: phone || 'N/A',
              address,
              email: email || undefined,
              district: district || undefined,
              totalOrders,
              totalSpent,
              points: Math.floor(totalSpent * 0.05),
              lastOrderDate: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          }
        }

        if (importedCustomers.length === 0) {
          setImportStatus('No valid customer rows could be extracted from this file.');
          setIsImporting(false);
          return;
        }

        setImportStatus(`Saving ${importedCustomers.length} customers to database...`);
        await dbService.bulkSaveCustomers(importedCustomers);

        setIsImportModalOpen(false);
        setIsImporting(false);
        setImportStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Bulk Import Successful',
          message: `Successfully processed and imported ${importedCustomers.length} customers.`
        });
      } catch (err: any) {
        console.error('Customer CSV import error:', err);
        setImportStatus(`Import failed: ${err?.message || 'Unknown error'}`);
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Customers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {customers.length.toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Sales Revenue</p>
            <h3 className="text-2xl font-extrabold text-teal-700 mt-1">
              ৳{totalSpentAll.toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Average Order Value</p>
            <h3 className="text-2xl font-extrabold text-blue-700 mt-1">
              ৳{(customers.length ? Math.round(totalSpentAll / customers.length) : 0).toLocaleString()}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Customer Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive client database ({customers.length} total customers)
            </p>
          </div>

          {/* Action Toolbar: Search + Bulk Export CSV + Bulk Import CSV */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, phone or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Export all filtered customer records to CSV"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Import CSV Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Import customers from CSV file"
            >
              <Upload className="h-4 w-4 text-white" />
              <span>Bulk Import</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-center">Last Order</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedCustomers.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400 font-bold text-[11px] w-10">
                    {((currentPage - 1) * itemsPerPage) + idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {c.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="h-3.5 w-3.5 text-teal-600" />
                      <span>{c.phone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.address || 'Address not specified'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                    <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-teal-200/60">
                      {c.totalOrders || 0}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-teal-800 font-mono">
                    ৳{(c.totalSpent || 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                    {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                        title="View customer profile"
                      >
                        Details
                      </button>
                      {c.phone && c.phone !== 'N/A' && (
                        <a
                          href={`https://wa.me/88${c.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No customer records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6 rounded-b-2xl">
            <div className="flex justify-between sm:hidden w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">
                  Showing <span className="font-bold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> of <span className="font-bold text-slate-900">{filteredCustomers.length}</span> customers
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-xl shadow-2xs" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-xl px-2.5 py-1.5 text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-xs"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-3.5 py-1.5 text-xs font-bold cursor-pointer border ${
                        currentPage === i + 1 
                        ? 'z-10 bg-teal-600 text-white border-teal-600' 
                        : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-xl px-2.5 py-1.5 text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-xs"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Customers Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Bulk Import Customers</h3>
                  <p className="text-xs text-slate-500">Upload CSV file to import multiple customers at once</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStatus(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Supported CSV Columns:</p>
                <code className="block bg-white p-2 rounded border border-slate-200 font-mono text-[11px] text-teal-700">
                  Name, Phone, Address, Email, District, Total Orders, Total Spent
                </code>
                <p className="text-[11px] text-slate-500">
                  Existing customers with matching phone numbers will automatically be updated with new orders/spent values.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-teal-50/20"
              >
                <FileSpreadsheet className="h-10 w-10 text-teal-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  Click to select a CSV file from your computer
                </p>
                <p className="text-[11px] text-slate-400 mt-1">.csv format</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {importStatus && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  isImporting ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-800'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="text-xs text-teal-600 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample Template</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 flex items-center space-x-3 mt-1">
                  <span>Phone: {selectedCustomer.phone}</span>
                  <span>•</span>
                  <span>Total Orders: {selectedCustomer.totalOrders || 0}</span>
                  <span>•</span>
                  <span>Total Spent: ৳{(selectedCustomer.totalSpent || 0).toLocaleString()}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Address:</span>
                <p className="text-slate-600">{selectedCustomer.address || 'Address not specified'}</p>
                {selectedCustomer.district && (
                  <p className="text-slate-500 font-mono">District: {selectedCustomer.district}</p>
                )}
                {selectedCustomer.email && (
                  <p className="text-slate-500 font-mono">Email: {selectedCustomer.email}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
