import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Copy, Check, RefreshCw, ShieldAlert } from 'lucide-react';
import api from '../api';
import { useCurrency } from '../App';

const LetterGenerator = () => {
  const { symbol } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [customCreditor, setCustomCreditor] = useState('');
  const [hardshipReason, setHardshipReason] = useState('Job Loss / Unemployment');
  const [customHardship, setCustomHardship] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLoans = async () => {
    try {
      setLoansLoading(true);
      const res = await api.get('/loans');
      setLoans(res.data);
      if (res.data.length > 0) {
        setSelectedLoanId(res.data[0].id.toString());
      } else {
        setSelectedLoanId('custom');
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

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setGeneratedLetter('');
    setCopied(false);

    try {
      let creditorName = '';
      let balance = 0;

      if (selectedLoanId === 'custom') {
        creditorName = customCreditor;
        balance = 0;
      } else {
        const selectedLoan = loans.find(l => l.id.toString() === selectedLoanId);
        creditorName = selectedLoan?.creditor_name || '';
        balance = selectedLoan?.total_balance || 0;
      }

      if (!creditorName) {
        setErrorMsg('Please specify a creditor name.');
        setLoading(false);
        return;
      }

      const payload = {
        creditor_name: creditorName,
        total_balance: parseFloat(balance) || 0.0,
        hardship_reason: hardshipReason === 'Other' ? customHardship : hardshipReason,
        proposed_settlement_amount: proposedAmount ? parseFloat(proposedAmount) : null
      };

      const res = await api.post('/ai/generate-letter', payload);
      setGeneratedLetter(res.data.letter_text);
    } catch (error) {
      setErrorMsg(error.response?.data?.detail || 'Failed to generate letter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loansLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-455 font-mono">Loading active profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-900 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
            <FileText className="h-6 w-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">AI Hardship Composer</h2>
        </div>
        <p className="text-xs text-slate-500">Draft certified debt relief letters and proposed repayment agreements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Panel - Left (Col 5) */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800/60 shadow-lg">
          <h3 className="text-md font-semibold text-slate-202 mb-4 border-b border-slate-900 pb-3 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
            <span>Composer Configurations</span>
          </h3>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Active Creditor</label>
              <select
                value={selectedLoanId}
                onChange={(e) => {
                  setSelectedLoanId(e.target.value);
                  setErrorMsg('');
                  setGeneratedLetter('');
                }}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all cursor-pointer"
              >
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.creditor_name} ({symbol}{loan.total_balance.toLocaleString()})
                  </option>
                ))}
                <option value="custom">-- Custom / Unlisted Creditor --</option>
              </select>
            </div>

            {selectedLoanId === 'custom' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Creditor Name</label>
                  <input
                    type="text"
                    required
                    value={customCreditor}
                    onChange={(e) => setCustomCreditor(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                    placeholder="e.g. Chase Bank"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hardship Reason</label>
              <select
                value={hardshipReason}
                onChange={(e) => {
                  setHardshipReason(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-105 text-sm outline-none transition-all cursor-pointer"
              >
                <option value="Job Loss / Unemployment">Job Loss / Unemployment</option>
                <option value="Medical Emergency / Severe Illness">Medical Emergency / Severe Illness</option>
                <option value="Reduction in Income / Hour Cuts">Reduction in Income / Hour Cuts</option>
                <option value="Divorce / Family Separation">Divorce / Family Separation</option>
                <option value="Other">Other (Write Custom Reason)</option>
              </select>
            </div>

            {hardshipReason === 'Other' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Describe Custom Hardship</label>
                <textarea
                  required
                  rows="3"
                  value={customHardship}
                  onChange={(e) => setCustomHardship(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all resize-none"
                  placeholder="Explain briefly (e.g., temporary disability)"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Proposed Amount ({symbol}) (Optional)</label>
              <input
                type="number"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
                placeholder="e.g. 3000"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Leave blank to request a structured installment plan.</span>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-455 p-3 rounded-xl text-xs font-mono">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-3 rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] active:translate-y-[2px] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Drafting Proposal...</span>
                </>
              ) : (
                <span>Compile Letter</span>
              )}
            </button>
          </form>
        </div>

        {/* Paper Preview Sheet - Right (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Document Preview</span>
            {generatedLetter && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider active:scale-[0.96] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span>Copy Letter Text</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col justify-center min-h-[480px]">
            {loading && (
              <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-md"></div>
                  <FileText className="h-5 w-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-slate-200 font-bold uppercase tracking-wide text-xs">Generating letter</h4>
                  <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs mx-auto">Evaluating hardships and financial parameters to write the proposal...</p>
                </div>
              </div>
            )}

            {!generatedLetter && !loading && (
              <div className="bg-slate-950/80 border-dashed border border-slate-850 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                <FileText className="h-10 w-10 text-slate-700 animate-pulse" />
                <div>
                  <h4 className="text-slate-450 font-bold uppercase tracking-wide text-xs">Awaiting input parameters</h4>
                  <p className="text-[10px] text-slate-550 mt-1.5 max-w-xs mx-auto">Configure your creditor, proposed settlement details, and hardship terms on the left to write the letter.</p>
                </div>
              </div>
            )}

            {generatedLetter && !loading && (
              <div className="bg-white text-slate-805 p-8 md:p-10 rounded-xl shadow-xl relative select-text min-h-[430px] border border-slate-200 font-sans leading-relaxed text-sm text-slate-900 animate-fade-in">
                <div className="whitespace-pre-wrap">
                  {generatedLetter}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterGenerator;
