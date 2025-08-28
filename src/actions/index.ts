import {
    login,
    create,
    logout,
    getUser,
    changePassword,
    updateProfile
} from "./users/index.ts";
import {
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getAccounts
} from "./transactions/index.ts";
import {
    createRecurringTransaction,
    getRecurringTransactions,
    getRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateRecurringTransactions
} from "./recurring-transactions/index.ts";
import {
    createFamily,
    joinFamily,
    leaveFamily,
    leaveAndDeleteFamily,
    getFamilies,
    getFamilyDetails,
    updateUserRole,
    removeUserFromFamily
} from "./families/index.ts";
import {
    createAccount,
    getAccounts as getAccountsList,
    getAccount,
    getAccountBalanceHistory,
    updateAccount,
    deleteAccount,
    restoreAccount,
    purgeAccount,
    bulkRestoreAccounts,
    bulkPurgeAccounts,
    updateDailyBalance,
    recalculateAccountBalance
} from "./accounts/index.ts";
import {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    purgeCategory,
    bulkPurgeCategories,
    bulkRestoreCategories
} from "./categories/index.ts";
import {
    createTag,
    getTags,
    getTag,
    updateTag,
    deleteTag,
    restoreTag,
    purgeTag,
    bulkRestoreTags,
    bulkPurgeTags
} from "./tags/index.ts";
import { getHealth } from "./health/read.ts";

const server = {
    login,
    create,
    logout,
    getUser,
    changePassword,
    updateProfile,
    createTransaction,
    getTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getAccounts,
    getCategories,
    createRecurringTransaction,
    getRecurringTransactions,
    getRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateRecurringTransactions,
    createFamily,
    joinFamily,
    leaveFamily,
    leaveAndDeleteFamily,
    getFamilies,
    getFamilyDetails,
    updateUserRole,
    removeUserFromFamily,
    createAccount,
    getAccountsList,
    getAccount,
    getAccountBalanceHistory,
    updateAccount,
    deleteAccount,
    restoreAccount,
    purgeAccount,
    bulkRestoreAccounts,
    bulkPurgeAccounts,
    updateDailyBalance,
    recalculateAccountBalance,
    createCategory,
    getCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    purgeCategory,
    bulkPurgeCategories,
    bulkRestoreCategories,
    createTag,
    getTags,
    getTag,
    updateTag,
    deleteTag,
    restoreTag,
    purgeTag,
    bulkRestoreTags,
    bulkPurgeTags
    ,getHealth
};

export { server };