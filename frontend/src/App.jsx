import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, DollarSign, ArrowRight, UserPlus, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import api from './api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AIPredictor from './components/AIPredictor';
import LetterGenerator from './components/LetterGenerator';

// --- Auth Context Setup ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// --- Currency Context Setup ---
const CurrencyContext = createContext(null);
export const useCurrency = () => useContext(CurrencyContext);

const CurrencyProvider = ({ children }) => {
  const auth = useAuth();
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    if (auth?.user?.currency) {
      setCurrencyState(auth.user.currency);
    }
  }, [auth?.user]);

  const setCurrency = async (newCurrency) => {
    setCurrencyState(newCurrency);
    if (auth?.user && auth?.updateProfile) {
      await auth.updateProfile({ currency: newCurrency });
    }
  };

  const getSymbol = () => {
    switch (currency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'C$';
      case 'INR': return '₹';
      default: return '$';
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol: getSymbol() }}>
      {children}
    </CurrencyContext.Provider>
  );
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to authenticate token', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.access_token);
      
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setLoading(false);
      navigate('/');
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.detail || 'Invalid email or password.'
      };
    }
  };

  const register = async (email, password, monthlyIncome, currency) => {
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email,
        password,
        monthly_income: parseFloat(monthlyIncome) || 0,
        currency: currency || 'USD'
      });
      setLoading(false);
      return await login(email, password);
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.detail || 'Registration failed.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/me', {
        monthly_income: updates.monthly_income !== undefined ? parseFloat(updates.monthly_income) : user.monthly_income,
        currency: updates.currency !== undefined ? updates.currency : user.currency
      });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to update profile.'
      };
    }
  };

  const updateIncome = async (newIncome) => {
    return await updateProfile({ monthly_income: newIncome });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateIncome, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-955">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-400">Securing environment...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// --- Login Page Component ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 glow-emerald animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center bg-emerald-500/10 p-3 rounded-2xl mb-4 border border-emerald-500/30">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Access your secure Aegis Debt Shield</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3 rounded-lg text-sm mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-700 outline-none transition-all duration-150"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-700 outline-none transition-all duration-150"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-955 font-semibold py-3 rounded-xl active:scale-[0.98] active:translate-y-[2px] transition-all duration-100 disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying Account...' : (
              <>
                <span>Sign In Securely</span>
                <LogIn className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-550 mt-6">
          New to Aegis?{' '}
          <button onClick={() => navigate('/register')} className="text-emerald-400 hover:underline font-medium">
            Create an Account
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Register Page Component ---
const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [income, setIncome] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await register(email, password, income, currency);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-955 px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 glow-emerald animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center bg-emerald-500/10 p-3 rounded-2xl mb-4 border border-emerald-500/30">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Create Aegis Shield</h1>
          <p className="text-xs text-slate-450 mt-1">Initiate your AI recovery and relief profile</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3 rounded-lg text-sm mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-700 outline-none transition-all duration-150"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-700 outline-none transition-all duration-150"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Monthly Net Income</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  required
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 pl-10 pr-4 text-slate-100 text-sm placeholder-slate-700 outline-none transition-all duration-150"
                  placeholder="e.g. 5000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Currency</label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 focus:scale-[1.01] rounded-xl py-3 px-3 text-slate-100 text-sm outline-none transition-all duration-150 appearance-none cursor-pointer"
                >
                  <option value="USD" className="bg-slate-950 text-slate-100">USD ($)</option>
                  <option value="INR" className="bg-slate-950 text-slate-100">INR (₹)</option>
                  <option value="EUR" className="bg-slate-950 text-slate-100">EUR (€)</option>
                  <option value="GBP" className="bg-slate-950 text-slate-100">GBP (£)</option>
                  <option value="CAD" className="bg-slate-950 text-slate-100">CAD (C$)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-550">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-955 font-semibold py-3 rounded-xl active:scale-[0.98] active:translate-y-[2px] transition-all duration-100 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Profile...' : (
              <>
                <span>Generate Account</span>
                <UserPlus className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-550 mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-emerald-400 hover:underline font-medium">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Page Shell and Sidebar Layout Wrapper ---
const AppLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predictor" element={<AIPredictor />} />
          <Route path="/letters" element={<LetterGenerator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
