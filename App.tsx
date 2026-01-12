
import React, { useState, useMemo } from 'react';
import { ViewType, NormalizedRow, CalculationResult, Pillar, PillarTrendPoint, LiabilityGiver } from './types';
import { parseType8Workbook, formatMonth, PILLAR_PROTOCOL } from './services/parser';
import { calculateFinancials, generatePillarTrends, sum } from './services/calc';

const formatCurrency = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN');
};

const Sidebar: React.FC<{ currentView: ViewType, setView: (v: ViewType) => void }> = ({ currentView, setView }) => {
    const navItems = [
        { id: ViewType.Dashboard, label: 'Governance Dashboard', icon: 'fa-chess-rook' },
        { id: ViewType.Ledger, label: 'The Chronicle', icon: 'fa-scroll' },
        { id: ViewType.Protocol, label: 'Protocol Rulebook', icon: 'fa-shield-halved' }
    ];

    return (
        <aside className="w-64 shrink-0 p-4 h-screen flex flex-col border-r border-[var(--border)] bg-[var(--bg)]">
            <div className="panel p-5 mb-4 bg-[#CFB284] text-white">
                <h1 className="text-xl font-extrabold flex items-center gap-2">
                    <i className="fa-solid fa-crown"></i>
                    Master of Coin
                </h1>
                <p className="text-[10px] uppercase tracking-widest opacity-80 mt-1">DOBI Governance v2.0</p>
            </div>
            
            <nav className="panel p-2 space-y-1 text-sm flex-1">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            currentView === item.id 
                            ? 'bg-[#FFEFCB] text-[#5D4037] font-bold shadow-sm border border-[#CFB284]' 
                            : 'text-stone-500 hover:bg-[#FFFDE7] dark:hover:bg-stone-800'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon}`}></i>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="panel p-4 mt-4 bg-[#FFEFCB] dark:bg-stone-900/50">
                <p className="text-[10px] uppercase text-stone-500 font-bold mb-2">Persistence Engine</p>
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Amortization Scanned
                </div>
            </div>
        </aside>
    );
};

const LiabilityBreakdown: React.FC<{ breakdown: LiabilityGiver[] }> = ({ breakdown }) => {
    const active = breakdown.filter(g => g.status === 'Active');
    const cleared = breakdown.filter(g => g.status === 'Cleared');

    return (
        <div className="panel p-6 mt-4 animate-in slide-in-from-top duration-300 border-rose-100 bg-rose-50/10">
            <h4 className="text-sm font-black text-stone-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                <i className="fa-solid fa-users-viewfinder text-[#A1887F]"></i>
                Giver-Bridge Ledger (R6 Residuals)
            </h4>

            <div className="space-y-4">
                {active.map((g, i) => (
                    <div key={i} className="group p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-black text-stone-800 dark:text-stone-200 uppercase text-xs">{g.name}</span>
                                <div className="text-[10px] text-stone-400 mt-1 uppercase font-bold">Principal Remaining</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-rose-500">{formatCurrency(g.residualAmount)}</div>
                            </div>
                        </div>
                    </div>
                ))}

                {cleared.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
                        <div className="flex flex-wrap gap-2">
                            {cleared.map((g, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2">
                                    <i className="fa-solid fa-check-circle"></i>
                                    {g.name}: Cleared
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewType>(ViewType.Dashboard);
    const [currentMonth, setCurrentMonth] = useState<string>('ALL');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [data, setData] = useState<NormalizedRow[]>([]);
    const [showLiabilityDetail, setShowLiabilityDetail] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                // @ts-ignore
                const workbook = window.XLSX.read(new Uint8Array(evt.target?.result as any), { type: "array" });
                const parsed = parseType8Workbook(workbook);
                setData(parsed);
            } catch (err) { alert("Parsing Failure."); }
        };
        reader.readAsArrayBuffer(file);
    };

    const filtered = useMemo(() => currentMonth === 'ALL' ? data : data.filter(r => r.month === currentMonth), [data, currentMonth]);
    const results = useMemo(() => filtered.length > 0 ? calculateFinancials(filtered, data) : null, [filtered, data]);
    const months = useMemo(() => Array.from(new Set(data.map(d => d.month))).sort(), [data]);

    const totalClearance = useMemo(() => {
        if (!results) return 0;
        return results.liabilityBreakdown.reduce((acc, curr) => acc + curr.repayment, 0);
    }, [results]);

    return (
        <div className="h-screen flex overflow-hidden font-sans selection:bg-[#FFEFCB] selection:text-[#5D4037]">
            <Sidebar currentView={view} setView={setView} />

            <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[var(--bg)]">
                <header className="panel p-5 flex justify-between items-center border-[#F6E3BA]">
                    <div>
                        <h2 className="text-xl font-black text-stone-800 dark:text-stone-100 uppercase tracking-tighter">Master Governance</h2>
                        <p className="text-[10px] text-[#CFB284] font-black uppercase tracking-widest">{currentMonth === 'ALL' ? 'Cumulative Chronicle' : formatMonth(currentMonth)}</p>
                    </div>

                    <div className="flex gap-3">
                        <select value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="border border-[#F6E3BA] rounded-xl px-4 py-2 bg-white text-xs font-black uppercase">
                            <option value="ALL">Global Snapshot</option>
                            {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                        </select>
                        <label className="bg-[#CFB284] text-white px-5 py-2 rounded-xl cursor-pointer text-xs font-black uppercase flex items-center gap-2">
                            <i className="fa-solid fa-folder-open"></i> Ingest
                            <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
                        </label>
                    </div>
                </header>

                {view === ViewType.Dashboard && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="panel p-6 border-[#CFB284] border-l-8">
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Inflow</h4>
                                <div className="text-2xl font-black">{formatCurrency(results?.income || 0)}</div>
                            </div>
                            <div className="panel p-6 border-[#A1887F] border-l-8">
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-1">Operating Costs</h4>
                                <div className="text-2xl font-black">{formatCurrency(results?.expenses || 0)}</div>
                            </div>
                            <div className="panel p-6 border-emerald-400 border-l-8">
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-1">Debt Clearance</h4>
                                <div className="text-2xl font-black text-emerald-600">{formatCurrency(totalClearance)}</div>
                            </div>
                            <div onClick={() => setShowLiabilityDetail(!showLiabilityDetail)} className="panel p-6 border-rose-400 border-l-8 cursor-pointer hover:translate-y-[-2px] transition-all">
                                <h4 className="font-bold text-[10px] text-stone-500 uppercase tracking-widest mb-1">Outstanding Residual</h4>
                                <div className="text-2xl font-black text-rose-500">{formatCurrency(results?.liability || 0)}</div>
                            </div>
                        </div>

                        {showLiabilityDetail && results && <LiabilityBreakdown breakdown={results.liabilityBreakdown} />}

                        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {(['D', 'O', 'B', 'I'] as Pillar[]).map(p => (
                                <div key={p} className="panel p-5 border-l-4" style={{ borderColor: '#CFB284' }}>
                                    <span className="text-lg font-black text-stone-300">[{p}]</span>
                                    <div className="text-xl font-black mt-1">{formatCurrency(results?.pillars[p].total || 0)}</div>
                                    <p className="text-[10px] text-stone-400 uppercase font-bold mt-1">{PILLAR_PROTOCOL[p].header}</p>
                                </div>
                            ))}
                        </section>
                    </div>
                )}

                {view === ViewType.Protocol && (
                    <div className="panel p-8 bg-white border-[#CFB284]">
                        <h3 className="text-lg font-black mb-6">DOBI v2.0 Ruleset</h3>
                        <div className="space-y-4 text-xs font-bold uppercase tracking-tight text-stone-500">
                            <div className="p-4 bg-stone-50 rounded-xl">1. Giver-Bridge Logic: Repayments reduce Principal residuals and are excluded from Budget_Total.</div>
                            {/* FIX: Wrapped mathematical notation string in a literal to avoid interpretation of curly braces as React expressions */}
                            <div className="p-4 bg-stone-50 rounded-xl">2. Persistence: {'$L_{next} = (L_{opening} + L_{new}) - R_{paid}$'} carried forward chronologically.</div>
                            <div className="p-4 bg-stone-50 rounded-xl">3. Identity: Debt chains are tracked by Giver Name extracted from Notes.</div>
                        </div>
                    </div>
                )}

                {view === ViewType.Ledger && (
                    <div className="panel overflow-x-auto border-[#F6E3BA]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#FFEFCB] font-black uppercase text-[9px]">
                                <tr>
                                    <th className="px-6 py-4">Pillar</th>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4">Giver</th>
                                    <th className="px-6 py-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filtered.map((r, i) => (
                                    <tr key={i} className="hover:bg-stone-50">
                                        <td className="px-6 py-4 font-black">[{r.pillar}]</td>
                                        <td className="px-6 py-4 font-bold">{r.item} {r.isMirrorEntry && '🔗'}</td>
                                        <td className="px-6 py-4 text-right font-black">{formatCurrency(r.amount)}</td>
                                        <td className="px-6 py-4 uppercase font-black text-[9px]">{r.giver || 'N/A'}</td>
                                        <td className="px-6 py-4 italic text-stone-400">{r.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
