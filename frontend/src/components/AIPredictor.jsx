import React, { useState, useEffect } from 'react';
import { ShieldCheck, Brain, ArrowRight, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api';
import { useCurrency } from '../App';

const AIPredictor = () => {
  const { symbol } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loansLoading, setLoansLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLoans = async () => {
    try {
      setLoansLoading(true);
      const res = await api.get('/loans');
      setLoans(res.data);
      if (res.data.length > 0) {
        setSelectedLoanId(res.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoansLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!selectedLoanId) return;
    
    setLoading(true);
    setErrorMsg('');
    setPrediction(null);
    try {
      const res = await api.get(`/ai/predict-settlement/${selectedLoanId}`);
      setPrediction(res.data);
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || 'Failed to run AI Settlement Prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedLoan = loans.find(l => l.id.toString() === selectedLoanId);

  const getLikelihoodBadge = (likelihood) => {
    if (likelihood === 'High') {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
    if (likelihood === 'Medium') {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    return 'text-rose-455 bg-rose-500/10 border-rose-500/20';
  };

  if (loansLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-400 font-mono">Loading active loan profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-slate-900 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
            <Brain className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">AI Settlement Predictor</h2>
        </div>
        <p className="text-xs text-slate-500">Simulate targeted settlement values based on creditor risk matrices.</p>
      </div>

      {loans.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Side - Left (Col 5) */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800/60 shadow-lg">
            <h3 className="text-md font-semibold text-slate-200 mb-4 border-b border-slate-900 pb-3 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
              <span>Target Analysis Calibration</span>
            </h3>

            <form onSubmit={handlePredict} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select Target Account</label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => {
                    setSelectedLoanId(e.target.value);
                    setPrediction(null);
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all cursor-pointer"
                >
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.creditor_name} - {symbol}{loan.total_balance.toLocaleString()} ({loan.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLoan && (
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 space-y-3 shadow-inner">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Calibrated parameters</span>
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                    <div>
                      <p className="text-slate-500 mb-0.5 uppercase tracking-wide">Balance:</p>
                      <p className="text-slate-200 font-bold">{symbol}{selectedLoan.total_balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5 uppercase tracking-wide">Interest:</p>
                      <p className="text-emerald-400 font-bold">{selectedLoan.interest_rate}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5 uppercase tracking-wide">Min monthly:</p>
                      <p className="text-slate-202 font-bold">{symbol}{selectedLoan.minimum_payment}/mo</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-0.5 uppercase tracking-wide">Delinquency:</p>
                      <p className="text-slate-202 font-bold">{selectedLoan.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3.5 rounded-xl text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl active:scale-[0.98] active:translate-y-[2px] transition-all shadow-lg shadow-emerald-500/15 uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Target...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Forecast</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Side - Right (Col 7) */}
          <div className="lg:col-span-7 space-y-6">
            {loading && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center h-full min-h-[350px]">
                <div className="relative">
                  <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-md"></div>
                  <Brain className="h-5 w-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-slate-202 font-bold uppercase tracking-wide text-xs">Processing data registers</h4>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">Evaluating income limits, monthly DTI levels, and delinquency vectors...</p>
                </div>
              </div>
            )}

            {!prediction && !loading && (
              <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[350px] border-dashed border-2 border-slate-800/80">
                <Brain className="h-10 w-10 text-slate-700 animate-pulse" />
                <div>
                  <h4 className="text-slate-350 font-bold uppercase tracking-wide text-xs">Awaiting Command</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">Select an active account profile on the left and run analysis to populate calculations.</p>
                </div>
              </div>
            )}

            {prediction && !loading && (
              <div className="space-y-6 animate-fade-in">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-800/60 shadow-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Offer</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <h4 className="text-2xl font-extrabold text-slate-100">
                        {prediction.target_settlement_percentage}%
                      </h4>
                      <span className="text-xs text-slate-500 font-semibold">of balance</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Offer: {symbol}{(selectedLoan?.total_balance * prediction.target_settlement_percentage / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-800/60 shadow-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Savings</span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <h4 className="text-2xl font-extrabold text-slate-100">
                        {symbol}{prediction.estimated_savings?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Debt Forgiven</p>
                  </div>

                  {/* Card 3 */}
                  <div className="glass-card rounded-2xl p-5 border border-slate-800/60 shadow-lg flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Likelihood</span>
                    <div className="my-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getLikelihoodBadge(prediction.success_likelihood)}`}>
                        {prediction.success_likelihood}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Agreement probability</p>
                  </div>
                </div>

                {/* Strategy Text */}
                <div className="glass-card rounded-2xl p-6 border border-slate-800/60 shadow-lg">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-205 mb-4 border-b border-slate-900 pb-3">
                    AI-Generated Negotiation Playbook
                  </h3>
                  
                  <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {prediction.negotiation_strategy}
                  </div>
                  
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mt-5 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-450 leading-relaxed">
                      <strong>Aegis Legal Safeguard:</strong> This analysis is intended as negotiating guidelines. Keep communications documented in writing, and obtain a formal settlement contract prior to making any payments.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4 border border-slate-800/60 shadow-lg">
          <ShieldAlert className="h-10 w-10 text-slate-555" />
          <div>
            <h4 className="text-slate-350 font-bold uppercase tracking-wide text-sm font-sans">No Active Loans Logged</h4>
            <p className="text-xs text-slate-550 mt-1">To run AI settlement predictions, log your active debt records on the dashboard first.</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-955 px-5 py-2.5 rounded-xl text-xs font-semibold active:scale-[0.98] active:translate-y-[2px] transition-all"
          >
            <span>Return to Dashboard</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AIPredictor;
