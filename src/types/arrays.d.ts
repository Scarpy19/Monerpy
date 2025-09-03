const transactionTypes = [
    "Income",
    "Expense",
];

const accountTypes = [
    { value: "Cash", label: "Cash", icon: "💵" },
    { value: "Checking", label: "Checking Account", icon: "🏦" },
    { value: "Savings", label: "Savings Account", icon: "💰" },
    { value: "CreditCard", label: "Credit Card", icon: "💳" },
    { value: "Investment", label: "Investment Account", icon: "📈" },
    { value: "Loan", label: "Loan Account", icon: "🏠" },
];

// Days of week for weekly frequency
const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

// Months for yearly frequency
const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const timePeriods = [
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
    { days: 90, label: "90 days" },
    { days: 180, label: "6 months" },
    { days: 365, label: "1 year" },
];

const colors = [
    "#6172f3", // Purple
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#ec4899", // Pink
    "#6b7280", // Gray
    "#14b8a6", // Teal
    "#f43f5e", // Rose
];

const frequency = [
    "Daily",
    "Weekly",
    "Monthly",
    "Yearly",
]

const TOAST_TYPES = {
    SUCCESS: "success",
    ERROR: "error",
    INFO: "info",
    WARNING: "warning",
};

const RECURRING_STATUS_COLORS: Record<string, string> = {
    ACTIVE: "text-green-400",
    COMPLETED: "text-gray-400",
    SCHEDULED: "text-yellow-400",
    CANCELLED: "text-red-400",
};

const RECURRING_TEXT_COLORS: Record<string, string> = {
    ACTIVE: "text-green-500",
    COMPLETED: "text-gray-500",
    SCHEDULED: "text-yellow-500",
    CANCELLED: "text-red-500",
}

const BTN_SIZES: Record<string, string> = {
    sm: "text-sm px-3 py-1.5 gap-1",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2",
};

export {
    TOAST_TYPES,
    RECURRING_STATUS_COLORS,
    RECURRING_TEXT_COLORS,
    transactionTypes,
    accountTypes,
    daysOfWeek,
    months,
    timePeriods,
    colors,
    frequency,
    BTN_SIZES,
}