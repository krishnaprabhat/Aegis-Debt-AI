import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Plus, Edit2, Trash2, ShieldAlert, DollarSign, Wallet, Percent, Heart, RefreshCw, X } from 'lucide-react';
import api from '../api';
import { useAuth, useCurrency } from '../App';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const { user, updateIncome } = useAuth();
  const { currency, setCurrency, symbol } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incomeInput, setIncomeInput] = useState(user?.monthly_income || 0);
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [loanForm, setLoanForm] = useState({
    creditor_name: '',
    total_balance: '',
    minimum_payment: '',
    interest_rate: '',
    status: 'Current'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [loansRes, healthRes] = await Promise.all([
        api.get('/loans'),
        api.get('/analytics/health')
      ]);
      setLoans(loansRes.data);
      setAnalytics(healthRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (user) {
      setIncomeInput(user.monthly_income);
    }
  }, [user]);

  const handleIncomeSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await updateIncome(incomeInput);
    setActionLoading(false);
    if (res.success) {
      setIsEditingIncome(false);
      fetchDashboardData();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLoan(null);
    setLoanForm({
      creditor_name: '',
      total_balance: '',
      minimum_payment: '',
      interest_rate: '',
      status: 'Current'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loan) => {
    setEditingLoan(loan);
    setLoanForm({
      creditor_name: loan.creditor_name,
      total_balance: loan.total_balance,
      minimum_payment: loan.minimum_payment,
      interest_rate: loan.interest_rate,
      status: loan.status
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        creditor_name: loanForm.creditor_name,
        total_balance: parseFloat(loanForm.total_balance),
        minimum_payment: parseFloat(loanForm.minimum_payment),
        interest_rate: parseFloat(loanForm.interest_rate),
        status: loanForm.status
      };

      if (editingLoan) {
        await api.put(`/loans/${editingLoan.id}`, payload);
      } else {
        await api.post('/loans', payload);
      }

      setIsModalOpen(false);
      fetchDashboardData();
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || 'Failed to submit loan details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan record?')) return;
    try {
      await api.delete(`/loans/${loanId}`);
      fetchDashboardData();
    } catch (error) {
      alert('Failed to delete loan.');
    }
  };

  const pieData = loans.map((l) => ({
    name: l.creditor_name,
    value: l.total_balance
  }));

  const barData = loans.map((l) => ({
    name: l.creditor_name,
    Rate: l.interest_rate
  }));

  const getDtiColor = (dti) => {
    if (dti <= 20) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (dti <= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-450';
    if (score >= 60) return 'text-amber-450';
    return 'text-rose-455';
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-400">Loading data...</p>
        </div>
      </div>
    );
  }

  const score = analytics?.financial_health_score || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top command ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between justify-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Financial Command</h2>
          <p className="text-xs text-slate-500 mt-1">Real-time balances, health index score, and active asset monitoring.</p>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {/* Income block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <span className="text-xs text-slate-500 font-medium">Income:</span>
            {isEditingIncome ? (
              <form onSubmit={handleIncomeSubmit} className="flex items-center gap-2">
                <input
                  type="number"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  className="w-20 bg-slate-950 text-emerald-400 border border-slate-800 rounded px-2 py-0.5 text-xs outline-none"
                />
                <button type="submit" disabled={actionLoading} className="text-emerald-400 text-xs font-bold hover:underline">Save</button>
                <button type="button" onClick={() => setIsEditingIncome(false)} className="text-slate-500 text-xs">X</button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-sm tracking-wider">
                  {symbol}{(user?.monthly_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <button onClick={() => setIsEditingIncome(true)} className="text-slate-500 hover:text-emerald-400 transition-colors">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Premium Currency Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1 gap-1">
            {['USD', 'EUR', 'GBP', 'CAD', 'INR'].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${
                  currency === curr
                    ? 'bg-emerald-500 text-slate-955 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-955 px-4 py-2.5 rounded-xl text-xs font-semibold active:scale-[0.98] active:translate-y-[2px] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Grid of Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between text-slate-450">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding Debt</span>
            <Wallet className="h-5 w-5 text-slate-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-wide mt-4">
            {symbol}{(analytics?.total_debt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Active liability total</p>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between text-slate-450">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Pay Burden</span>
            <DollarSign className="h-5 w-5 text-slate-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-wide mt-4">
            {symbol}{(analytics?.monthly_debt_burden || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Minimum monthly outflow</p>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between text-slate-450">
            <span className="text-xs font-semibold uppercase tracking-wider">DTI Ratio Score</span>
            <Percent className="h-5 w-5 text-slate-500" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-wide mt-4">
            {analytics?.dti_ratio}%
          </h3>
          <div className="mt-2">
            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getDtiColor(analytics?.dti_ratio)}`}>
              {analytics?.dti_ratio <= 36 ? 'Healthy Index' : 'Overburdened'}
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between text-slate-450">
            <span className="text-xs font-semibold uppercase tracking-wider">System Health Index</span>
            <Heart className="h-5 w-5 text-slate-500" />
          </div>
          <h3 className={`text-2xl font-extrabold tracking-wide mt-4 ${getHealthColor(score)}`}>
            {score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
          </h3>
          <p className="text-xs text-slate-550 mt-2">Calculated rating index</p>
        </div>

      </div>

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pie Chart */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/60 shadow-lg flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350 border-b border-slate-900 pb-3 mb-4">Debt Distribution allocation</h3>
          {loans.length > 0 ? (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      formatter={(value) => [`${symbol}${value.toLocaleString()}`, 'Balance']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {loans.map((loan, idx) => (
                  <div key={loan.id} className="flex items-center justify-between text-xs border-b border-slate-900/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="text-slate-400 font-semibold truncate max-w-[100px]">{loan.creditor_name}</span>
                    </div>
                    <span className="text-slate-200 font-bold">{symbol}{loan.total_balance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
              <ShieldAlert className="h-8 w-8 text-slate-700 animate-pulse" />
              <p className="text-xs text-slate-500 font-medium max-w-xs">No active records found. Add loan details to populate chart indicators.</p>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/60 shadow-lg flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350 border-b border-slate-900 pb-3 mb-4">Interest Rate Telemetry</h3>
          {loans.length > 0 ? (
            <div className="flex-1 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value) => [`${value}%`, 'Interest Rate']}
                  />
                  <Bar dataKey="Rate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
              <ShieldAlert className="h-8 w-8 text-slate-700 animate-pulse" />
              <p className="text-xs text-slate-500 font-medium max-w-xs">No active rates found. Add loan details to populate chart indices.</p>
            </div>
          )}
        </div>

      </div>

      {/* Table ledger */}
      <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-slate-900/80 bg-slate-900/10 flex items-center justify-between">
          <div>
            <h3 className="text-md font-bold text-slate-205">Liability Registry</h3>
            <p className="text-xs text-slate-500 mt-1">Detailed database of registered accounts and indicators.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loans.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-900 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Creditor Profile</th>
                  <th className="px-6 py-4">Total Balance</th>
                  <th className="px-6 py-4">Monthly minimum</th>
                  <th className="px-6 py-4">Interest Rate</th>
                  <th className="px-6 py-4">Status Flag</th>
                  <th className="px-6 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300 text-sm">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-900/10 transition-all">
                    <td className="px-6 py-4 font-semibold text-slate-100">{loan.creditor_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-200">{symbol}{(loan.total_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">{symbol}{(loan.minimum_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-emerald-450 font-semibold">{loan.interest_rate}%</td>
                    <td className="px-6 py-4">
                      {loan.status === 'Current' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          Current
                        </span>
                      )}
                      {loan.status === '30 Days Late' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20">
                          30 Days Late
                        </span>
                      )}
                      {loan.status === '90+ Days Late' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full text-rose-455 bg-rose-500/10 border border-rose-500/20">
                          90+ Days Late
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(loan)}
                        className="inline-flex p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 active:scale-[0.9] transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
                        className="inline-flex p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-455 hover:border-rose-500/30 active:scale-[0.9] transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-slate-600 font-mono">
              No active records. Log your liabilities above to initiate analytics.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900/95 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden animate-fade-in relative backdrop-blur-md">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-450 hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 border-b border-slate-850 bg-slate-900/40">
              <h3 className="text-lg font-bold text-slate-100">
                {editingLoan ? 'Modify Account Record' : 'Record New Loan Account'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Provide creditor parameters for portfolio analysis.</p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoanSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Creditor Name</label>
                <input
                  type="text"
                  required
                  value={loanForm.creditor_name}
                  onChange={(e) => setLoanForm({ ...loanForm, creditor_name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                  placeholder="Chase Bank, Wells Fargo"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Total Balance ({symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.total_balance}
                    onChange={(e) => setLoanForm({ ...loanForm, total_balance: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                    placeholder="e.g. 5000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Min Monthly Payment ({symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.minimum_payment}
                    onChange={(e) => setLoanForm({ ...loanForm, minimum_payment: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                    placeholder="e.g. 150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.interest_rate}
                    onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                    placeholder="e.g. 14.99"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Account Status</label>
                  <select
                    value={loanForm.status}
                    onChange={(e) => setLoanForm({ ...loanForm, status: e.target.value })}
                    className="w-full bg-slate-955/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="Current">Current</option>
                    <option value="30 Days Late">30 Days Late</option>
                    <option value="90+ Days Late">90+ Days Late</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-455 hover:text-slate-202 text-xs font-bold uppercase tracking-wider active:scale-[0.98] active:translate-y-[2px] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-955 text-xs font-bold uppercase tracking-wider active:scale-[0.98] active:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Debt Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
