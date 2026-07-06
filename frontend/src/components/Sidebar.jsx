import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BadgePercent, FileText, LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../App';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Settlement Predictor',
      path: '/predictor',
      icon: BadgePercent,
    },
    {
      name: 'AI Letter Generator',
      path: '/letters',
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 shadow-lg">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight text-md">Aegis Debt</h1>
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">AI Recovery</span>
          </div>
        </div>
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Information Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-950/40 border border-slate-800/40 mb-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450 shrink-0">
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-350 truncate">
              {user?.email}
            </p>
            <p className="text-[10px] text-slate-500">
              Income: ${user?.monthly_income?.toLocaleString()}/mo
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-rose-450 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all duration-200"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Secure Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
