// Extend Astro's App.Locals to include user information
declare global {
    namespace App {
        interface Locals {
            user?: {
                id: number;
                username: string;
                email: string;
                created: string;
            };
        }
    }
}

// Enums from Prisma schema represented as string literal unions
type UserRole = "Admin" | "Member";
type AccountType = "Cash" | "Checking" | "Savings" | "CreditCard" | "Investment" | "Loan";
type TransactionType = "Income" | "Expense";
type Frequency = "Daily" | "Weekly" | "Monthly" | "Yearly";

// Basic utility types for session/toast
interface Session {
    userId: number;
    username: string;
    email: string;
    created: string; // unix timestamp
    fingerprint: string; // Browser fingerprint hash
    csrfToken: string; // CSRF protection token
    isLongTerm: boolean; // Whether this is a long-term (30d) or short-term (24h) session
}

interface Toast {
    id: string;
    message: string;
    type: "success" | "error" | "warning" | "info" | string;
    duration?: number;
}

// Prisma-aligned model interfaces
interface Family {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations (the DB model: arrays are always present)
    users?: User[];
    accounts?: Account[];
    categories?: Category[];
    tags?: Tag[];

    // optional count helper when included
    _count?: { users?: number; accounts?: number; categories?: number; tags?: number } | null;
}

interface User {
    id: number;
    familyId?: number | null;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    lastLogin?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    family?: Family | null;
    transactions?: Transaction[];
    recurringTransactions?: RecurringTransaction[];

    _count?: { transactions?: number; recurringTransactions?: number } | null;
}

interface Account {
    id: number;
    familyId: number;
    name: string;
    accountType: AccountType;
    balance: number;
    color: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    family?: Family;
    accountBalances?: AccountBalance[];
    transactions?: Transaction[];
    recurringTransactions?: RecurringTransaction[];

    _count?: { accountBalances?: number; transactions?: number; recurringTransactions?: number } | null;
}

interface AccountBalance {
    id: number;
    accountId: number;
    date: string;
    balance: number;
    cashBalance: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    account?: Account;
}

interface Category {
    id: number;
    familyId: number;
    name: string;
    color: string;
    parentId?: number | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    family?: Family;
    parent?: Category | null;
    children?: Category[];
    transactions?: Transaction[];
    recurringTransactions?: RecurringTransaction[];

    _count?: { transactions?: number; children?: number } | null;
}

interface Tag {
    id: number;
    familyId: number;
    name: string;
    color: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    family?: Family;
    transactions?: Transaction[];
    recurringTransactions?: RecurringTransaction[];

    _count?: { transactions?: number; recurringTransactions?: number } | null;
}

interface Transaction {
    id: number;
    accountId: number;
    userId: number;
    categoryId?: number | null;
    date: string;
    name: string;
    amount: number;
    type: TransactionType;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations (per schema these are non-null for account and user)
    account: Account;
    user: User;
    category?: Category | null;
    tags?: Tag[];
    recurringLog?: RecurringTransactionLog | null;
}

interface RecurringTransaction {
    id: number;
    accountId: number;
    userId: number;
    categoryId?: number | null;
    description: string;
    amount: number;
    type: TransactionType;
    frequency: Frequency;
    month?: number | null;
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    timeOfDay?: string | null;
    startDate: string;
    endDate?: string | null;
    maxOccurrences?: number | null;
    occurrencesCount: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;

    // Relations
    account: Account;
    user: User;
    category?: Category | null;
    tags?: Tag[];
    logs?: RecurringTransactionLog[];

    _count?: { tags?: number; logs?: number } | null;
}

interface RecurringTransactionLog {
    id: number;
    recurringTransactionId: number;
    generatedTransactionId?: number | null;
    executionTime: string;
    createdAt: string;
    updatedAt: string;

    // Relations
    recurringTransaction: RecurringTransaction;
    generatedTransaction?: Transaction | null;
}

// Action response types (adjusted to use Prisma-aligned model names)
type GetCategoriesOk = { ok: true; categories: Category[] };
type GetCategoriesError = { ok: false; error: string };
type GetCategoriesResult = GetCategoriesOk | GetCategoriesError;

type GetAccountsOk = { ok: true; accounts: Account[] };
type GetAccountsError = { ok: false; error: string };
type GetAccountsResult = GetAccountsOk | GetAccountsError;

type GetTagsOk = { ok: true; tags: Tag[] };
type GetTagsError = { ok: false; error: string };
type GetTagsResult = GetTagsOk | GetTagsError;

type TransactionsPagination = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
} | null;

type GetTransactionsOk = { ok: true; transactions: Transaction[]; pagination: TransactionsPagination };
type GetTransactionsError = { ok: false; error: string };
type GetTransactionsResult = GetTransactionsOk | GetTransactionsError;

export {
    UserRole,
    AccountType,
    TransactionType,
    Frequency,
    Session,
    Toast,
    Family,
    User,
    Account,
    AccountBalance,
    Category,
    Tag,
    Transaction,
    RecurringTransaction,
    RecurringTransactionLog,
    GetCategoriesOk,
    GetCategoriesError,
    GetCategoriesResult,
    GetAccountsOk,
    GetAccountsError,
    GetAccountsResult,
    GetTagsOk,
    GetTagsError,
    GetTagsResult,
    TransactionsPagination,
    GetTransactionsOk,
    GetTransactionsError,
    GetTransactionsResult
}