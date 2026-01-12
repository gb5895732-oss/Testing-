export type TransactionType = 'income' | 'liability_in' | 'liability_repay' | 'expense' | 'savings' | 'adjustment';
export type Pillar = 'D' | 'O' | 'B' | 'I' | 'U' | 'N/A';
export type Realm = 'Income' | 'Liabilities' | 'Budget' | 'N/A';

export interface PillarMetadata {
    order: number;
    tag: Pillar;
    header: string;
    priority: 'High' | 'Medium' | 'Systemic' | 'Flexible' | 'N/A';
}

export interface LiabilityGiver {
    name: string;
    openingBalance: number;
    newLoan: number;
    repayment: number;
    residualAmount: number;
    status: 'Active' | 'Cleared';
}

export interface NormalizedRow {
    month: string;
    dateISO: string; // ISO date for chronological sorting
    type: TransactionType;
    realm: Realm;
    pillar: Pillar;
    category?: string;
    item: string;
    amount: number;
    notes?: string;
    giver?: string;
    classification?: string;
    description?: string;
    subtype?: 'budget' | 'spent' | 'reconciliation';
    isMirrorEntry?: boolean; // DOBI v2.0: Link between Budget and Liability
    // Persistence Fields (DOBI V2.0)
    openingBalance?: number;
    newLoan?: number;
    repayment?: number;
    residualAmount?: number;
}

export interface PillarStats {
    total: number;
    items: { item: string; amount: number; description?: string; giver?: string }[];
}

export interface PillarTrendPoint {
    month: string;
    dateISO: string;
    pillars: Record<Pillar, number>;
    total: number;
}

export interface CalculationResult {
    income: number;
    savings: number;
    expenses: number;
    liability: number;
    liabilityBreakdown: LiabilityGiver[];
    netPosition: number;
    pillars: Record<Pillar, PillarStats>;
    funds: {
        esf: number;
        msf: number;
        ofc: number;
        dailyTea: number;
    };
    performance: {
        overall: number;
        discipline: number;
        savingsExecution: number;
    };
}

export enum ViewType {
    Dashboard = 'dashboard',
    Ledger = 'ledger',
    Protocol = 'protocol',
    Trends = 'trends'
}