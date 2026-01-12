import { NormalizedRow, CalculationResult, Pillar, PillarStats, PillarTrendPoint, LiabilityGiver } from '../types';

export const sum = (values: number[] = []): number => {
    return values.reduce((a, b) => a + (Number(b) || 0), 0);
};

export const clamp = (value: number, min = 0, max = 100): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * MASTER OF COIN ENGINE (DOBI V2.0)
 * Implements "Giver-Bridge Logic" and "Amortization Persistence".
 * Override Rule: Remove 'Loan Repayment' from Budget_Total; apply to Principal residual.
 */
export const calculateFinancials = (currentRows: NormalizedRow[], allData: NormalizedRow[]): CalculationResult => {
    const incomeRows = currentRows.filter(r => r.type === 'income');
    const savingsRows = currentRows.filter(r => r.type === 'savings');
    // BRIDGE RULE: Operating expenses MUST NOT include mirror entries.
    const expenseRows = currentRows.filter(r => r.type === 'expense' && !r.isMirrorEntry);
    const repayRows = currentRows.filter(r => r.type === 'liability_repay');
    
    const income = sum(incomeRows.map(r => r.amount));
    const totalSavings = sum(savingsRows.map(r => r.amount));
    
    // Giver-Bridge Mapping: Operational Expenses exclude Mirror entries.
    const totalOperatingExpenses = sum(expenseRows.map(r => r.amount));
    const totalDebtClearance = sum(repayRows.map(r => r.amount));
    
    // Net Position strictly accounts for the Bridge Jumper.
    const totalOutflow = totalOperatingExpenses + totalDebtClearance + totalSavings;

    // PERSISTENCE SCAN: Build the longitudinal "Chronicle"
    const allGivers = Array.from(new Set(allData.filter(r => r.giver && r.giver !== 'N/A').map(r => r.giver!)));
    const sortedISO = Array.from(new Set(allData.map(d => d.dateISO))).sort();
    const currentMonthISOs = new Set(currentRows.map(r => r.dateISO));
    
    const runningResiduals: Record<string, number> = {};
    const finalBreakdown: LiabilityGiver[] = [];

    sortedISO.forEach(iso => {
        const isFocusMonth = currentMonthISOs.has(iso);
        const monthRows = allData.filter(d => d.dateISO === iso);

        allGivers.forEach(giver => {
            const matchedGiverRows = monthRows.filter(r => r.giver === giver);
            const opening = runningResiduals[giver] || 0;
            const newLoan = sum(matchedGiverRows.filter(r => r.type === 'liability_in').map(r => r.amount));
            const repayment = sum(matchedGiverRows.filter(r => r.type === 'liability_repay').map(r => r.amount));
            
            // Bridge Mapping: Subtract_From_Principal
            const residual = (opening + newLoan) - repayment;
            runningResiduals[giver] = residual <= 0.01 ? 0 : residual;

            if (isFocusMonth) {
                const status = residual <= 0.01 ? 'Cleared' : 'Active';
                const existingIdx = finalBreakdown.findIndex(b => b.name === giver);
                
                if (existingIdx >= 0) {
                    const b = finalBreakdown[existingIdx];
                    b.newLoan += newLoan;
                    b.repayment += repayment;
                    b.residualAmount = runningResiduals[giver];
                    b.status = status;
                } else if (opening !== 0 || newLoan !== 0 || repayment !== 0 || runningResiduals[giver] !== 0) {
                    finalBreakdown.push({
                        name: giver,
                        openingBalance: opening,
                        newLoan,
                        repayment,
                        residualAmount: runningResiduals[giver],
                        status
                    });
                }
            }
        });
    });

    // Global Outstanding at the end of selection (R6 Residual)
    const latestISO = Array.from(currentMonthISOs).sort().pop();
    let totalResidual = 0;
    if (latestISO) {
        const stateAtEnd: Record<string, number> = {};
        sortedISO.filter(iso => iso <= latestISO).forEach(iso => {
            const mRows = allData.filter(d => d.dateISO === iso);
            allGivers.forEach(giver => {
                const matchedGiverRows = mRows.filter(r => r.giver === giver);
                const op = stateAtEnd[giver] || 0;
                const nl = sum(matchedGiverRows.filter(r => r.type === 'liability_in').map(r => r.amount));
                const rp = sum(matchedGiverRows.filter(r => r.type === 'liability_repay').map(r => r.amount));
                const res = (op + nl) - rp;
                stateAtEnd[giver] = res <= 0.01 ? 0 : res;
            });
        });
        totalResidual = sum(Object.values(stateAtEnd));
    } else {
        totalResidual = sum(Object.values(runningResiduals));
    }

    // PILLAR AGGREGATION
    const pillars: Record<Pillar, PillarStats> = {
        'D': { total: 0, items: [] },
        'O': { total: 0, items: [] },
        'B': { total: 0, items: [] },
        'I': { total: 0, items: [] },
        'U': { total: 0, items: [] },
        'N/A': { total: 0, items: [] }
    };

    currentRows.forEach(r => {
        if (r.pillar !== 'N/A' && (r.type === 'expense' || r.type === 'savings' || r.type === 'liability_repay')) {
            pillars[r.pillar].total += r.amount;
            pillars[r.pillar].items.push({ 
                item: r.item, 
                amount: r.amount, 
                description: r.description,
                giver: r.giver 
            });
        }
    });

    const esf = sum(currentRows.filter(r => r.item === 'ESF').map(r => r.amount));
    const msf = sum(currentRows.filter(r => r.item === 'MSF').map(r => r.amount));
    const ofc = sum(currentRows.filter(r => r.item === 'OFC' || r.item === 'Passive_Saving').map(r => r.amount));
    const dailyTea = sum(currentRows.filter(r => r.item === 'Daily Tea').map(r => r.amount));

    return {
        income,
        savings: totalSavings,
        expenses: totalOperatingExpenses, 
        liability: totalResidual,
        liabilityBreakdown: finalBreakdown,
        netPosition: income - totalOutflow,
        pillars,
        funds: { esf, msf, ofc, dailyTea },
        performance: {
            overall: Math.round(clamp((1 - (totalOutflow / (income || 1))) * 100)),
            discipline: Math.round(clamp((1 - (totalOperatingExpenses / (income || 1))) * 100)),
            savingsExecution: Math.round(clamp((totalSavings / (income || 1)) * 100))
        }
    };
};

export const generatePillarTrends = (allData: NormalizedRow[]): PillarTrendPoint[] => {
    const months = Array.from(new Set(allData.map(d => d.dateISO))).sort();
    return months.map(iso => {
        const monthRows = allData.filter(d => d.dateISO === iso);
        const sums: Record<Pillar, number> = { 'D': 0, 'O': 0, 'B': 0, 'I': 0, 'U': 0, 'N/A': 0 };
        let total = 0;
        monthRows.forEach(r => {
            if (r.pillar !== 'N/A' && (r.type === 'expense' || r.type === 'savings' || r.type === 'liability_repay')) {
                sums[r.pillar] += r.amount;
                total += r.amount;
            }
        });
        return { month: monthRows[0]?.month || "Unknown", dateISO: iso, pillars: sums, total };
    });
};