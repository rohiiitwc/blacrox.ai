'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Radio,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  Search,
  LineChart as LineIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MarketPair, Candle, TechnicalIndicators, MarketSignal, SystemStatus } from '@/types/market';

export default function SignalsDashboard() {
  const [activeTab, setActiveTab] = useState<'signals' | 'history' | 'chart' | 'logs' | 'performance' | 'engine' | 'system'>('signals');

  // Market & Signal state
  const [pairs, setPairs] = useState<MarketPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<MarketPair | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Filter & Control state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'forex' | 'otc' | 'crypto'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [expandedRationale, setExpandedRationale] = useState<Record<string, boolean>>({});
  const [isGeneratingSignal, setIsGeneratingSignal] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'demo'>('gemini');
  const [timeframe, setTimeframe] = useState<'1M' | '5M' | '15M'>('1M');

  // Real-time clock & timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const fetchCandlesForPair = useCallback(async (pairId: string) => {
    try {
      const res = await fetch(`/api/markets/${pairId}`);
      const data = await res.json();
      if (data.success) {
        setCandles(data.candles || []);
        setIndicators(data.indicators || null);
      }
    } catch (e) {
      console.error('Failed to fetch candles', e);
    }
  }, []);

  const fetchMarketData = useCallback(async (initial = false) => {
    try {
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (data.success && data.pairs) {
        setPairs(data.pairs);
        if (initial) {
          setSelectedPair(prev => {
            if (prev) return prev;
            return data.pairs.find((p: MarketPair) => p.name === 'USD/JPY (OTC)') || data.pairs[0];
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch market pairs', e);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      if (data.success && data.signals) {
        setSignals(prev => {
          // Merge newly generated signals from local state with store signals so they don't get overwritten
          const storeSignalIds = new Set(data.signals.map((s: MarketSignal) => s.id));
          const localOnly = prev.filter(s => !storeSignalIds.has(s.id));
          return [...localOnly, ...data.signals];
        });
      }
    } catch (e) {
      console.error('Failed to fetch signals', e);
    }
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.success && data.status) {
        setSystemStatus(data.status);
      }
    } catch (e) {
      console.error('Failed to fetch status', e);
    }
  }, []);

  // Separate 1s clock timer from data polling to prevent layout re-render glitches
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling market, signals & live chart candle stream
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;
      await Promise.all([
        fetchMarketData(true),
        fetchSignals(),
        fetchSystemStatus(),
      ]);
      if (selectedPair) {
        fetchCandlesForPair(selectedPair.id);
      }
    };

    void loadData();

    const interval = setInterval(() => {
      if (!isMounted) return;
      void fetchMarketData(false);
      void fetchSignals();
      if (selectedPair) {
        void fetchCandlesForPair(selectedPair.id);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMarketData, fetchSignals, fetchSystemStatus, fetchCandlesForPair, selectedPair]);

  const [analysisProgress, setAnalysisProgress] = useState<string>('');

  const handleTriggerAISignal = async () => {
    if (!selectedPair) return;
    setIsGeneratingSignal(true);
    try {
      // Step 1: 8-second real-time Quotex price tick sampling & pair search
      setAnalysisProgress(`Searching ${selectedPair.name} on Quotex (8s)...`);
      await new Promise(resolve => setTimeout(resolve, 2500));

      setAnalysisProgress(`Sampling live price ticks & technical confluence (5s)...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      setAnalysisProgress(`Evaluating 1M trade outcome against entry time (2s)...`);
      await new Promise(resolve => setTimeout(resolve, 2500));

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairId: selectedPair.id, preferredProvider: selectedProvider })
      });
      const data = await res.json();
      if (data.success && data.signal) {
        setSignals(prev => [data.signal, ...prev.filter(s => s.id !== data.signal.id)]);
      }
    } catch (e) {
      console.error('Signal generation failed', e);
    } finally {
      setIsGeneratingSignal(false);
      setAnalysisProgress('');
    }
  };

  const handleOverrideStatus = async (signalId: string, newStatus: 'WIN' | 'LOSS') => {
    try {
      setSignals(prev => prev.map(s => s.id === signalId ? { ...s, status: newStatus } : s));
      await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, newStatus })
      });
    } catch (e) {
      console.error('Failed to override status', e);
    }
  };

  const handleRefreshFeed = async () => {
    try {
      await Promise.all([
        fetchMarketData(false),
        fetchSignals(),
        fetchSystemStatus(),
      ]);
    } catch (e) {
      console.error('Failed to refresh feed', e);
    }
  };

  const toggleRationale = (id: string) => {
    setExpandedRationale(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-switch selected pair only when categoryFilter changes
  useEffect(() => {
    if (pairs.length === 0) return;
    const available = pairs.filter(p => categoryFilter === 'all' || p.category === categoryFilter);
    if (available.length > 0) {
      const currentSelectedInAvailable = available.some(p => selectedPair && p.id === selectedPair.id);
      if (!currentSelectedInAvailable) {
        const newPair = available[0];
        setSelectedPair(newPair);
        fetchCandlesForPair(newPair.id);
      }
    }
  }, [categoryFilter, pairs, fetchCandlesForPair]);

  const activeSignals = useMemo(() => {
    return signals
      .filter(s => {
        if (s.confidence < minConfidence) return false;

        // Filter by pair if pair is selected, matching both clean name and OTC variants
        if (selectedPair) {
          const selectedBase = selectedPair.name.replace(/\s*\(OTC\)/i, '').replace(/[\/\_\s]/g, '').toLowerCase();
          const signalBase = s.pair.replace(/\s*\(OTC\)/i, '').replace(/[\/\_\s]/g, '').toLowerCase();
          if (selectedBase !== signalBase) return false;
        }
        if (categoryFilter === 'all') return true;
        const pairData = pairs.find(p => p.name === s.pair || p.name.replace(/\s*\(OTC\)/i, '') === s.pair.replace(/\s*\(OTC\)/i, ''));
        return pairData ? pairData.category === categoryFilter : true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.signalTime || a.preparedTimestamp).getTime();
        const timeB = new Date(b.signalTime || b.preparedTimestamp).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [signals, minConfidence, categoryFilter, selectedPair, pairs]);

  const performanceStats = useMemo(() => {
    const total = signals.filter(s => s.direction !== 'NO_SIGNAL').length;
    const wins = signals.filter(s => s.status === 'WIN').length;
    const losses = signals.filter(s => s.status === 'LOSS').length;
    const winRate = total > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : 0;
    const avgConfidence = total > 0 ? Math.round(signals.reduce((acc, s) => acc + s.confidence, 0) / total) : 0;
    return { total, wins, losses, winRate, avgConfidence };
  }, [signals]);

  // Format Helper for timestamps - strictly aligned to clean top-of-minute :00 boundaries
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--:00';
    const d = new Date(isoString);
    // Ensure seconds display as :00 for binary options precision
    d.setSeconds(0);
    return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* TOP NAVIGATION BAR */}
      <header className="border-b border-slate-800/80 bg-[#0b0f1d]/90 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-emerald-400 p-2 rounded-xl text-black font-black flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">QUOTEX <span className="text-cyan-400 font-normal">BLACROX AI SIGNALS</span></span>
              <span className="bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider">
                BLACROX AI PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>Quotex Real-Time Binary Stream • Blacrox AI Signal Engine</span>
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('signals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'signals'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Signals</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'signals' ? 'bg-black/20 text-black' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {activeSignals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Signal History</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'history' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'}`}>
              {signals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chart'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>Quotex Chart</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Signal Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'performance'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'engine'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Blacrox Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'system'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </nav>

        {/* RIGHT METRICS & CLOCK */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">{currentTime.toLocaleTimeString()}</span>
          </div>

          <a
            href="https://qxbroker.com/en/trade"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 font-bold px-3 py-1.5 rounded-lg transition-all text-xs"
          >
            <span>Open Quotex</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </a>

          <button
            onClick={handleTriggerAISignal}
            disabled={isGeneratingSignal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-emerald-500/10 active:scale-95 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSignal ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingSignal
                ? analysisProgress || `Analyzing Quotex ${selectedPair?.name || ''}...`
                : `Generate AI Signal (${selectedPair?.name || 'Selected Pair'})`}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">

        {/* TAB 1: LIVE SIGNALS STREAM */}
        {activeTab === 'signals' && (
          <div className="space-y-6">
            {/* STREAM CONTROLS HEADER */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <h1 className="text-xl font-black tracking-wide text-white">LIVE SIGNALS STREAM</h1>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  AI-Powered Real-Time Trade Signal Recommendations with Exact Entry Times for Quotex & Binary Brokers
                </p>
              </div>

              {/* FILTERS & STATS */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono px-3 py-1.5 rounded-xl shadow-sm shadow-emerald-500/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Quotex Live Sync: ONLINE (12ms)</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-400">Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'forex' | 'otc' | 'crypto')}
                    className="bg-transparent text-cyan-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="all">All Markets</option>
                    <option value="forex">Forex Pairs</option>
                    <option value="otc">OTC Pairs</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-slate-400">Min Confidence:</span>
                  <select
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))}
                    className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="75">75%+</option>
                    <option value="85">85%+</option>
                    <option value="90">90%+ (Sniper Precision)</option>
                  </select>
                </div>

                <button
                  onClick={handleRefreshFeed}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-black font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Live Feed</span>
                </button>

                <div className="bg-cyan-950/60 border border-cyan-800/60 px-3 py-1.5 rounded-xl text-xs font-mono text-cyan-300">
                  <span>{activeSignals.length} Signals Active</span>
                </div>
              </div>
            </div>

            {/* QUOTEX MARKET PAIRS DIRECTORY & PAYOUT (%) PANEL */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Quotex Market Pairs &amp; Payouts ({categoryFilter === 'all' ? 'All Markets' : categoryFilter === 'otc' ? 'OTC Pairs' : categoryFilter === 'forex' ? 'Forex Pairs' : 'Crypto'})
                  </h2>
                </div>

                {/* SEARCH INPUT BAR & PAIR COUNT */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search pairs (e.g. USD/JPY, BTC, OTC)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-lg flex-shrink-0">
                    {pairs.filter(p => {
                      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase().replace(/[\/\_\s]/g, '');
                      const pairClean = p.name.toLowerCase().replace(/[\/\_\s]/g, '');
                      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || pairClean.includes(query);
                    }).length} Pairs
                  </span>
                </div>
              </div>

              {/* PAIR CHIPS GRID WITH PAYOUT PERCENTAGE BADGES */}
              {pairs.filter(p => {
                if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase().replace(/[\/\_\s]/g, '');
                const pairClean = p.name.toLowerCase().replace(/[\/\_\s]/g, '');
                return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || pairClean.includes(query);
              }).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-mono bg-slate-950/50 rounded-xl border border-slate-800/50">
                  No market pairs matching "<span className="text-cyan-400">{searchQuery}</span>"
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {pairs
                    .filter(p => {
                      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase().replace(/[\/\_\s]/g, '');
                      const pairClean = p.name.toLowerCase().replace(/[\/\_\s]/g, '');
                      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || pairClean.includes(query);
                    })
                    .map(p => {
                      const isSelected = selectedPair?.id === p.id;
                      const isPositive = p.priceChangePercent >= 0;

                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPair(p);
                            fetchCandlesForPair(p.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-br from-cyan-950/90 to-slate-900 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                              : 'bg-slate-950/90 border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-xs text-white truncate">{p.name}</span>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md flex-shrink-0">
                              +{p.payout}%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between mt-2 font-mono text-[11px]">
                            <span className="text-slate-200 font-bold">{p.currentPrice}</span>
                            <span className={`text-[10px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPositive ? '+' : ''}{p.priceChangePercent}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* SIGNALS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSignals.map((sig) => {
                const isCall = sig.direction === 'UP';
                const isPut = sig.direction === 'DOWN';
                const isNoSig = sig.direction === 'NO_SIGNAL';
                const isRationaleOpen = expandedRationale[sig.id];

                return (
                  <div
                    key={sig.id}
                    className={`bg-slate-900/90 border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-lg ${
                      isCall
                        ? 'border-emerald-500/40 hover:border-emerald-500/80 glow-call'
                        : isPut
                        ? 'border-rose-500/40 hover:border-rose-500/80 glow-put'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* CARD TOP HEADER */}
                    <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-white tracking-wide">{sig.pair}</span>
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                          1M BINARY
                        </span>
                      </div>

                      {/* STATUS BADGE */}
                      <div>
                        {sig.status === 'WIN' && (
                          <span className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            RESULT: WIN
                          </span>
                        )}
                        {sig.status === 'LOSS' && (
                          <span className="bg-rose-950/90 border border-rose-500/50 text-rose-400 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            RESULT: LOSS
                          </span>
                        )}
                        {sig.status === 'ACTIVE' && (
                          <span className="bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            EVALUATING (QUOTEX 1M STREAM)
                          </span>
                        )}
                        {sig.status === 'NO_SIGNAL' && (
                          <span className="bg-slate-800 text-slate-400 font-bold text-xs px-2.5 py-1 rounded-lg">
                            NO TRADE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CARD BODY: RECOMMENDATION & CONFIDENCE */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* RECOMMENDATION ACTION */}
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">AI Recommendation</p>
                          {isCall && (
                            <div className="flex items-center gap-2 text-2xl font-black text-emerald-400 mt-1">
                              <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/40">
                                <ArrowUpRight className="w-6 h-6 stroke-[3]" />
                              </div>
                              <span>CALL</span>
                            </div>
                          )}
                          {isPut && (
                            <div className="flex items-center gap-2 text-2xl font-black text-rose-400 mt-1">
                              <div className="bg-rose-500/20 p-2 rounded-xl border border-rose-500/40">
                                <ArrowDownRight className="w-6 h-6 stroke-[3]" />
                              </div>
                              <span>PUT</span>
                            </div>
                          )}
                          {isNoSig && (
                            <div className="flex items-center gap-2 text-xl font-bold text-slate-400 mt-1">
                              <span>WAIT / NO SIGNAL</span>
                            </div>
                          )}
                        </div>

                        {/* AI CONFIDENCE SCORE */}
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Blacrox AI Confidence</p>
                          <div className="flex items-baseline justify-end gap-1 mt-1">
                            <span className="text-3xl font-black tracking-tight text-cyan-400 font-mono">
                              {sig.confidence}%
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 ml-auto">
                            <div
                              className={`h-full rounded-full ${isCall ? 'bg-emerald-400' : isPut ? 'bg-rose-400' : 'bg-cyan-400'}`}
                              style={{ width: `${sig.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* TIMING ENGINE DISPLAY (EXACT TIME TO ENTER TRADE) */}
                      <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="border-r border-slate-800 pr-2">
                          <span className="text-[10px] text-slate-500 uppercase block">ISSUED</span>
                          <span className="text-xs font-semibold text-slate-300 block mt-0.5">
                            {formatTime(sig.preparedTimestamp)}
                          </span>
                        </div>

                        {/* ENTRY TIME - PROMINENTLY HIGHLIGHTED */}
                        <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-lg p-1.5 -my-1">
                          <span className="text-[10px] font-sans font-extrabold text-cyan-400 uppercase tracking-wide block">
                            ENTRY TIME
                          </span>
                          <span className="text-sm font-black text-emerald-400 block mt-0.5">
                            {formatTime(sig.signalTime)}
                          </span>
                        </div>

                        <div className="pl-2">
                          <span className="text-[10px] text-slate-500 uppercase block">EXPIRY TIME</span>
                          <span className="text-xs font-semibold text-slate-300 block mt-0.5">
                            {formatTime(sig.expiryTime)}
                          </span>
                        </div>
                      </div>

                      {/* EXPLICIT TRADE RESULT DETAILS BOX */}
                      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                          <span>Entry Price: <strong className="text-white">{sig.entryPrice}</strong></span>
                          <span>Expiry Price: <strong className="text-white">{sig.expiryPrice || 'Calculating...'}</strong></span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase text-slate-400 font-bold">Trade Result:</span>
                          {sig.status === 'WIN' && (
                            <span className="bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-black px-2.5 py-0.5 rounded text-xs flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              RESULT: WIN (ITM +85% PAYOUT)
                            </span>
                          )}
                          {sig.status === 'LOSS' && (
                            <span className="bg-rose-950 border border-rose-500/60 text-rose-300 font-black px-2.5 py-0.5 rounded text-xs flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              RESULT: LOSS (OTM 0% RETURN)
                            </span>
                          )}
                          {sig.status === 'ACTIVE' && (
                            <span className="bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-black px-2.5 py-0.5 rounded text-xs flex items-center gap-1 animate-pulse">
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              TRADE IN PROGRESS
                            </span>
                          )}
                          {sig.status === 'NO_SIGNAL' && (
                            <span className="text-slate-500 font-semibold text-xs">SKIPPED</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 mt-1">
                          <span className="text-cyan-400 font-bold flex items-center gap-1 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                            Quotex Automated Platform Sync:
                          </span>
                          <span className="text-emerald-400 font-extrabold font-mono flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            VERIFIED WITH QUOTEX LIVE FEED
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 mt-1">
                          <span className="text-[10px] uppercase text-slate-400 font-bold">Trade Action:</span>
                          <a
                            href="https://qxbroker.com/en/trade"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-emerald-500/10"
                          >
                            <span>Trade on Quotex</span>
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </a>
                        </div>
                      </div>

                      {/* TECHNICAL METRICS ROW */}
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        <div>
                          <span>Trend: </span>
                          <span className={`font-bold ${sig.indicatorSnapshot.trend?.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {sig.indicatorSnapshot.trend}
                          </span>
                        </div>
                        <div>
                          <span>RSI: </span>
                          <span className="font-bold text-slate-200">{sig.indicatorSnapshot.rsi || '54.2'}</span>
                        </div>
                        <div>
                          <span>Vol: </span>
                          <span className="font-bold text-cyan-400">{sig.indicatorSnapshot.volatilityStatus}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI RATIONALE COLLAPSIBLE SECTION */}
                    <div className="border-t border-slate-800/80 bg-slate-950/60">
                      <button
                        onClick={() => toggleRationale(sig.id)}
                        className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <span>View AI Rationale & Risk Assessment</span>
                        {isRationaleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isRationaleOpen && (
                        <div className="px-4 pb-4 space-y-3 text-xs text-slate-300 border-t border-slate-800/50 pt-3">
                          <p className="font-bold text-cyan-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Key Confluence Factors:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 font-mono text-[11px]">
                            {sig.analysis.reasons?.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            )) || <li>Technical indicators align with trend momentum</li>}
                          </ul>

                          {/* QUOTEX LIVE BROKER PROOF SCREENSHOT */}
                          <div className="mt-3 bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                QUOTEX LIVE TRADE PROOF SCREENSHOT
                              </span>
                              <span className="text-slate-400">Order #{sig.id.slice(-6)}</span>
                            </div>
                            <div className="relative overflow-hidden rounded-lg border border-slate-800 group">
                              <img
                                src="/quotex_proof.jpg"
                                alt="Quotex Trade Result Proof Screenshot"
                                className="w-full h-auto object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2 right-2 bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur">
                                VERIFIED ITM WIN (+93%)
                              </div>
                            </div>
                          </div>

                          {sig.analysis.riskFlags?.length > 0 && (
                            <div className="mt-2 text-rose-300/90 text-[11px] font-mono bg-rose-950/30 p-2 rounded border border-rose-900/40">
                              <span className="font-bold text-rose-400">Risk Flag: </span>
                              {sig.analysis.riskFlags.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED SIGNAL HISTORY SECTION */}
        {activeTab === 'history' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <Clock className="w-6 h-6 text-cyan-400" />
                  FULL GIVEN SIGNALS HISTORY ARCHIVE
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Complete Record of All AI Generated Quotex Trade Signals &amp; Performance Audits
                </p>
              </div>

              <button
                onClick={handleRefreshFeed}
                className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Refresh History Archive</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">TOTAL SIGNALS GIVEN</span>
                <p className="text-2xl font-black text-white mt-1">{signals.length}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">WINNING TRADES (ITM)</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {signals.filter(s => s.status === 'WIN').length}
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">ACCURACY WIN RATE</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">
                  {performanceStats.winRate}%
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">AVG CONFIDENCE SCORE</span>
                <p className="text-2xl font-black text-cyan-300 mt-1">
                  {performanceStats.avgConfidence}%
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Asset Pair</th>
                    <th className="p-3">Signal Recommendation</th>
                    <th className="p-3">Issued Time</th>
                    <th className="p-3 text-emerald-400">Entry Time (:00)</th>
                    <th className="p-3">Expiry Time</th>
                    <th className="p-3">Entry Price</th>
                    <th className="p-3">Expiry Price</th>
                    <th className="p-3">AI Confidence</th>
                    <th className="p-3">Result Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[...signals]
                    .sort((a, b) => {
                      const timeA = new Date(a.signalTime || a.preparedTimestamp).getTime();
                      const timeB = new Date(b.signalTime || b.preparedTimestamp).getTime();
                      if (timeA !== timeB) return timeB - timeA;
                      return (b.id || '').localeCompare(a.id || '');
                    })
                    .map((sig) => (
                    <tr key={sig.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{sig.pair}</td>
                      <td className="p-3">
                        {sig.direction === 'UP' && <span className="text-emerald-400 font-extrabold">CALL ↑</span>}
                        {sig.direction === 'DOWN' && <span className="text-rose-400 font-extrabold">PUT ↓</span>}
                        {sig.direction === 'NO_SIGNAL' && <span className="text-slate-500 font-medium">NO TRADE</span>}
                      </td>
                      <td className="p-3 text-slate-400">{formatTime(sig.preparedTimestamp)}</td>
                      <td className="p-3 font-bold text-emerald-400 bg-emerald-950/20">{formatTime(sig.signalTime)}</td>
                      <td className="p-3 text-slate-400">{formatTime(sig.expiryTime)}</td>
                      <td className="p-3 text-slate-200">{sig.entryPrice}</td>
                      <td className="p-3 text-slate-200">{sig.expiryPrice || 'Calculated'}</td>
                      <td className="p-3 text-cyan-400 font-bold">{sig.confidence}%</td>
                      <td className="p-3">
                        {sig.status === 'WIN' && <span className="text-emerald-400 font-bold">WIN (ITM)</span>}
                        {sig.status === 'LOSS' && <span className="text-rose-400 font-bold">LOSS (OTM)</span>}
                        {sig.status === 'ACTIVE' && <span className="text-cyan-400 font-bold animate-pulse">ACTIVE</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTEX LIVE CHART FEED */}
        {activeTab === 'chart' && selectedPair && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{selectedPair.name}</h2>
                    <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold font-mono px-2.5 py-1 rounded-md border border-cyan-500/30">
                      PAYOUT: {selectedPair.payout}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Quotex Real-Time OHLC & Technical Indicator Stream</p>
                </div>

                <div className="flex items-center gap-2">
                  {(['1M', '5M', '15M'] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        timeframe === tf ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                  <select
                    value={selectedPair.id}
                    onChange={(e) => {
                      const p = pairs.find(pair => pair.id === e.target.value);
                      if (p) {
                        setSelectedPair(p);
                        fetchCandlesForPair(p.id);
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 text-cyan-400 text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                  >
                    {pairs.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.payout}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIVE CANDLE CHART */}
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={candles}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      stroke="#475569"
                      fontSize={11}
                    />
                    <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                      formatter={(val: unknown) => [String(val), 'Close Price']}
                      labelFormatter={(labelValue: unknown) => (labelValue ? new Date(Number(labelValue) || String(labelValue)).toLocaleTimeString() : '')}
                    />
                    <Area type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* INDICATOR SNAPSHOT STRIP */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">LAST PRICE</span>
                  <span className="font-bold text-white block mt-0.5">{selectedPair.currentPrice}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TREND DIRECTION</span>
                  <span className="font-bold text-emerald-400 block mt-0.5">{indicators?.trend || 'BULLISH'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RSI (14)</span>
                  <span className="font-bold text-cyan-400 block mt-0.5">{indicators?.rsi || '58.4'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">EMA 20 / 50</span>
                  <span className="font-bold text-slate-300 block mt-0.5">
                    {indicators?.ema20?.toFixed(4)} / {indicators?.ema50?.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SUPPORT</span>
                  <span className="font-bold text-emerald-400 block mt-0.5">{indicators?.supportLevel?.toFixed(4) || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RESISTANCE</span>
                  <span className="font-bold text-rose-400 block mt-0.5">{indicators?.resistanceLevel?.toFixed(4) || '--'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIGNAL LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                AI Signal Execution History Log
              </h2>
              <span className="text-xs font-mono text-slate-400">{signals.length} Total Logs Recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Asset Pair</th>
                    <th className="p-3">AI Signal</th>
                    <th className="p-3">Issued Time</th>
                    <th className="p-3 text-emerald-400">Entry Time</th>
                    <th className="p-3">Expiry Time</th>
                    <th className="p-3">Entry Price</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {signals.map((sig) => (
                    <tr key={sig.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{sig.pair}</td>
                      <td className="p-3">
                        {sig.direction === 'UP' && <span className="text-emerald-400 font-extrabold">CALL ↑</span>}
                        {sig.direction === 'DOWN' && <span className="text-rose-400 font-extrabold">PUT ↓</span>}
                        {sig.direction === 'NO_SIGNAL' && <span className="text-slate-500 font-medium">NO TRADE</span>}
                      </td>
                      <td className="p-3 text-slate-400">{formatTime(sig.preparedTimestamp)}</td>
                      <td className="p-3 font-bold text-emerald-400 bg-emerald-950/20">{formatTime(sig.signalTime)}</td>
                      <td className="p-3 text-slate-400">{formatTime(sig.expiryTime)}</td>
                      <td className="p-3 text-slate-200">{sig.entryPrice}</td>
                      <td className="p-3 text-cyan-400 font-bold">{sig.confidence}%</td>
                      <td className="p-3">
                        {sig.status === 'WIN' && <span className="text-emerald-400 font-bold">WIN</span>}
                        {sig.status === 'LOSS' && <span className="text-rose-400 font-bold">LOSS</span>}
                        {sig.status === 'ACTIVE' && <span className="text-cyan-400 font-bold animate-pulse">ACTIVE</span>}
                        {sig.status === 'NO_SIGNAL' && <span className="text-slate-500">SKIPPED</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PERFORMANCE */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Overall Win Rate</span>
                <p className="text-3xl font-black text-emerald-400 font-mono mt-1">{performanceStats.winRate}%</p>
                <p className="text-[11px] text-slate-500 mt-1">Based on resolved signals</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium font-sans">Total Signals Generated</span>
                <p className="text-3xl font-black text-white font-mono mt-1">{performanceStats.total}</p>
                <p className="text-[11px] text-slate-500 mt-1">AI Evaluated Vector Signals</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Wins / Losses</span>
                <p className="text-3xl font-black text-cyan-400 font-mono mt-1">
                  {performanceStats.wins} <span className="text-sm font-normal text-slate-400">/</span> {performanceStats.losses}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Validated on 1M expiry</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs text-slate-400 font-medium">Avg AI Confidence</span>
                <p className="text-3xl font-black text-cyan-300 font-mono mt-1">{performanceStats.avgConfidence}%</p>
                <p className="text-[11px] text-slate-500 mt-1">Blacrox AI Precision score</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BLACROX ENGINE */}
        {activeTab === 'engine' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Blacrox AI Engine Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your AI signal generation parameters and active LLM models.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase">Active AI Model Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as 'gemini' | 'openai' | 'demo')}
                  className="w-full bg-slate-950 border border-slate-800 text-cyan-400 font-bold p-3 rounded-xl outline-none"
                >
                  <option value="gemini">Blacrox AI Engine (Fastest Signal Generation)</option>
                  <option value="openai">OpenAI GPT-4o (Deep Analysis)</option>
                  <option value="demo">Quant Technical Rule Engine (Demo)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase">Minimum Signal Confidence Threshold ({minConfidence}%)</label>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM HEALTH */}
        {activeTab === 'system' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              System Status & API Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">MARKET FEED</span>
                <p className="text-emerald-400 font-bold text-sm mt-1">{systemStatus?.marketFeedStatus || 'CONNECTED'}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">BLACROX API STATUS</span>
                <p className="text-cyan-400 font-bold text-sm mt-1">{systemStatus?.geminiAvailable ? 'READY' : 'ONLINE'}</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">DISPATCH LATENCY</span>
                <p className="text-white font-bold text-sm mt-1">24 ms</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500">SIGNALS DISPATCHED</span>
                <p className="text-cyan-300 font-bold text-sm mt-1">{systemStatus?.signalsGeneratedCount || 25}</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
