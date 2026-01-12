import { NormalizedRow, Pillar, Realm, PillarMetadata } from '../types';

declare const XLSX: any;

interface DOBIEntry {
    pillar: Pillar;
    realm: Realm;
    classification: string;
    description: string;
}

export const PILLAR_PROTOCOL: Record<Pillar, PillarMetadata> = {
    'D': { order: 1, tag: 'D', header: 'Essential !!', priority: 'High' },
    'O': { order: 2, tag: 'O', header: 'Need to Understand !!', priority: 'Medium' },
    'B': { order: 3, tag: 'B', header: 'Remind Me !!', priority: 'Systemic' },
    'I': { order: 4, tag: 'I', header: 'Things Which I do !!', priority: 'Flexible' },
    'U': { order: 5, tag: 'U', header: 'Uncategorized', priority: 'N/A' },
    'N/A': { order: 0, tag: 'N/A', header: 'N/A', priority: 'N/A' }
};

const DOBI_MAP: Record<string, DOBIEntry> = {
    "Salary": { pillar: "N/A", realm: "Income", classification: "Standard Inflow", description: "Primary income source." },
    "Borrowed Fund": { pillar: "N/A", realm: "Liabilities", classification: "Debt Inflow", description: "Funds taken from external sources." },
    "Balance_Sheet": { pillar: "N/A", realm: "Liabilities", classification: "Reconciliation", description: "Maintains the Iron Bank status." },
    "TIME": { pillar: "D", realm: "Budget", classification: "Saving/Fixed", description: "Monthly rent or survival time-cost." },
    "ESF": { pillar: "D", realm: "Budget", classification: "Education Fund", description: "Education Spending Fund for future fees." },
    "Daily Tea": { pillar: "D", realm: "Budget", classification: "Discipline Anchor", description: "Micro-metric for daily financial consistency." },
    "MSF": { pillar: "D", realm: "Budget", classification: "Medical Fund", description: "Medical Spending Fund for family health." },
    "Loan Repayment": { pillar: "D", realm: "Budget", classification: "Debt Service", description: "Execution of liability repayment." },
    "Cylinder": { pillar: "O", realm: "Budget", classification: "Operational", description: "Monthly utility (Gas)." },
    "Grocery": { pillar: "O", realm: "Budget", classification: "Operational", description: "Household food and supplies." },
    "Vegetable": { pillar: "O", realm: "Budget", classification: "Operational", description: "Fresh produce spending." },
    "Daily Spending": { pillar: "O", realm: "Budget", classification: "Operational", description: "Variable household daily costs." },
    "Occasionally": { pillar: "O", realm: "Budget", classification: "Operational", description: "Lifestyle optimization (Parties/Dining)." },
    "EMI": { pillar: "B", realm: "Budget", classification: "Fixed Obligation", description: "Equated Monthly Installments." },
    "OFC": { pillar: "B", realm: "Budget", classification: "Passive Saving", description: "The rounding-off saving from Realm 1." },
    "Passive_Saving": { pillar: "B", realm: "Budget", classification: "Passive Saving", description: "The rounding-off saving from Realm 1." },
    "Bills": { pillar: "B", realm: "Budget", classification: "Fixed Obligation", description: "Recurring utility and service bills." },
    "Travelling": { pillar: "I", realm: "Budget", classification: "Lifestyle", description: "Daily movement and travel charges." },
    "Recharge": { pillar: "I", realm: "Budget", classification: "Lifestyle", description: "Mobile and digital connectivity." },
    "FFF": { pillar: "I", realm: "Budget", classification: "Documentation", description: "Form Filling Fees for administrative needs." },
    "Unpredictable": { pillar: "I", realm: "Budget", classification: "Volatile", description: "Buffer for unexpected spending." },
    "Purchase": { pillar: "I", realm: "Budget", classification: "Asset", description: "Acquisition of personal items or assets." },
};

export const formatMonth = (monthStr: string): string => {
    const parts = monthStr.split(' ');
    if (parts.length !== 2) return monthStr;
    const monthNum = parseInt(parts[0]);
    const year = parts[1];
    const date = new Date(parseInt(year), monthNum - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const getISOFromMonthStr = (monthStr: string): string => {
    const parts = monthStr.split(' ');
    if (parts.length !== 2) return "0000-00";
    const mm = parts[0].padStart(2, '0');
    const yyyy = parts[1];
    return `${yyyy}-${mm}`;
};

/**
 * MASTER OF COIN: GIVER-BRIDGE HEURISTICS
 * Strictly extracts the Giver Name to support Realm-Jumper principal reduction.
 */
const extractGiverHeuristic = (notes: string, item: string): string | undefined => {
    const n = notes.toLowerCase();
    
    // Pattern: "Loan taken form Maya" (Typos handled per protocol)
    if (n.includes(' form ')) return notes.split(/ form /i).pop()?.trim();
    if (n.includes(' from ')) return notes.split(/ from /i).pop()?.trim();
    
    // Pattern: "Repayment of Marwadi"
    if (n.includes(' of ')) return notes.split(/ of /i).pop()?.trim();
    
    // Pattern: "Jagdish Loan" or "Jagdish Borrowing"
    const iParts = item.split(/\s+/);
    if (iParts.length > 1 && (iParts[1].toLowerCase() === 'loan' || iParts[1].toLowerCase() === 'borrowing')) {
        return iParts[0].trim();
    }

    return undefined;
};

export const parseType8Workbook = (workbook: any): NormalizedRow[] => {
    const normalized: NormalizedRow[] = [];
    
    Object.keys(workbook.Sheets).forEach((sheetName) => {
        if (sheetName === "Map & Details") return;
        if (!/^\d{2}\s\d{4}$/.test(sheetName) && !sheetName.toLowerCase().includes('month')) return;

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const month = sheetName;
        const dateISO = getISOFromMonthStr(month);

        rows.forEach((r: any) => {
            const label = String(r["Section"] || r["Basic Format"] || "").trim();
            const item = String(r["Item Name"] || r["__EMPTY"] || "").trim();
            let giver = String(r["Giver_Name"] || "").trim();
            const notes = String(r["Notes"] || r["__EMPTY_4"] || "").trim();
            
            const earnAmount = Number(r["Earn_Amount"]) || Number(r["Earn Amount"]) || Number(r["Taken_Amount"]) || Number(r["Taken Amount"]) || 0;
            const usedAmount = Number(r["Used_Amount"]) || Number(r["Used Amount"]) || Number(r["Paid Amount"]) || Number(r["Repayment"]) || Number(r["__EMPTY_2"]) || 0;
            const repaymentStatusValue = Number(r["Repayment_Status"]);
            const budgetAmount = Number(r["Budget Amount"]) || Number(r["__EMPTY_1"]) || 0;

            if (!item || item === "Item Name" || label === "Total" || item === "Total") return;

            // Bridge Mapping Detection: Extract Giver from Notes for "Loan Repayment"
            if (!giver || giver === "N/A" || giver === "") {
                const hGiver = extractGiverHeuristic(notes, item);
                if (hGiver) giver = hGiver;
            }

            let pillar: Pillar = "U"; 
            let realm: Realm = "Budget";
            let classification = "Other";
            let description = "";

            const mapping = DOBI_MAP[item] || DOBI_MAP[label];
            if (mapping) {
                pillar = mapping.pillar;
                realm = mapping.realm;
                classification = mapping.classification;
                description = mapping.description;
            }

            const normalizedLabel = label.toLowerCase();
            if (normalizedLabel.includes("essential")) {
                pillar = "D";
                realm = "Budget";
            } else if (normalizedLabel.includes("need to understand")) {
                pillar = "O";
                realm = "Budget";
            } else if (normalizedLabel.includes("remind me")) {
                pillar = "B";
                realm = "Budget";
            } else if (normalizedLabel.includes("things which i do") || normalizedLabel.includes("things which i did")) {
                pillar = "I";
                realm = "Budget";
            }

            // REALM 1: INCOME
            if (label === "Income" || item === "Salary" || realm === "Income") {
                const finalInflow = usedAmount || earnAmount || budgetAmount;
                if (finalInflow > 0) {
                    normalized.push({ 
                        month, dateISO, type: "income", realm: "Income", pillar: "N/A", 
                        item: item || "Salary", amount: finalInflow, notes, 
                        classification: "Standard Inflow", description: "Primary income source." 
                    });

                    if (earnAmount > usedAmount && usedAmount > 0) {
                        const passiveSavings = earnAmount - usedAmount;
                        normalized.push({
                            month, dateISO, type: "savings", realm: "Budget", pillar: "B", 
                            item: "Passive_Saving", amount: passiveSavings, 
                            notes: "OFC rounding difference", classification: "Passive Saving",
                            description: "Rounding-off saving from salary."
                        });
                    }
                }
                return;
            }

            // GIVER-BRIDGE LOGIC: Map 'Loan Repayment' to Liabilities Principal reduction
            if (label === "Liability" || item === "Borrowed Fund" || item === "Balance_Sheet" || realm === "Liabilities" || item === "Loan Repayment" || item.includes("Repayment")) {
                if (item === "Balance_Sheet") {
                    const totalOwed = earnAmount;
                    const totalPaid = !isNaN(repaymentStatusValue) ? repaymentStatusValue : usedAmount;
                    normalized.push({
                        month, dateISO, type: "adjustment", realm: "Liabilities", pillar: "N/A", 
                        item: "Balance_Sheet", amount: totalOwed - totalPaid, 
                        subtype: 'reconciliation', classification: "Reconciliation",
                        description: "Maintains the Iron Bank status.",
                        notes: `Owed: ${totalOwed}, Paid: ${totalPaid}. ${notes}`
                    });
                    return;
                }

                // New Borrowing (Taken Amount)
                if (earnAmount > 0 && item !== "Loan Repayment") {
                    normalized.push({ 
                        month, dateISO, type: "liability_in", realm: "Liabilities", pillar: "N/A", 
                        item: item || "Borrowed Fund", giver: (giver && giver !== "N/A") ? giver : undefined,
                        amount: earnAmount, notes, classification: "Debt Inflow",
                        description: "Funds borrowed from external sources."
                    });
                }
                
                // Repayment (Paid Amount)
                const finalRepayment = usedAmount || (!isNaN(repaymentStatusValue) ? repaymentStatusValue : 0);
                if (finalRepayment > 0) {
                    normalized.push({ 
                        month, dateISO, type: "liability_repay", realm: "Budget", pillar: "D", 
                        item: "Loan Repayment", giver: (giver && giver !== "N/A") ? giver : undefined,
                        amount: finalRepayment, notes, classification: "Debt Service",
                        description: "Execution of liability repayment.",
                        isMirrorEntry: true // BRIDGE OVERRIDE: Remove from Budget_Total
                    });
                }
                return;
            }

            if (usedAmount <= 0 && budgetAmount <= 0 && earnAmount <= 0) return;

            const type: any = (["TIME", "ESF", "MSF", "OFC", "Passive_Saving"].includes(item)) ? "savings" : "expense";
            normalized.push({
                month, dateISO, type, realm, pillar, category: label, item,
                amount: usedAmount || earnAmount || budgetAmount,
                notes, classification, description
            });
        });
    });

    return normalized;
};