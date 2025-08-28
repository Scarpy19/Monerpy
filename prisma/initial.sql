-- Synchronized schema based on Prisma models (priority) with snake_case column names
-- All date/time fields stored as TEXT (format enforced at application level)

PRAGMA foreign_keys = ON;

CREATE TABLE families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL, -- YYYY-MM-DD HH:mm:ss
    updated_at TEXT NOT NULL, -- YYYY-MM-DD HH:mm:ss
    deleted_at TEXT
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER REFERENCES families (id), -- nullable per Prisma
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('Admin','Member')) NOT NULL DEFAULT 'Member',
    last_login TEXT, -- YYYY-MM-DD HH:mm:ss
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families (id),
    name TEXT NOT NULL,
    account_type TEXT CHECK (account_type IN ('Cash','Checking','Savings','CreditCard','Investment','Loan')) NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0,
    color TEXT NOT NULL DEFAULT '#6172F3',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE account_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts (id),
    date TEXT NOT NULL, -- YYYY-MM-DD
    balance REAL NOT NULL,
    cash_balance REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    UNIQUE (account_id, date)
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families (id),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6172F3',
    parent_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families (id),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#e99537',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

-- Many-to-many: transactions <-> tags
CREATE TABLE transaction_tags (
    transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts (id),
    user_id INTEGER NOT NULL REFERENCES users (id),
    category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD HH:mm:ss
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK (type IN ('Income','Expense')) NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE recurring_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts (id),
    user_id INTEGER NOT NULL REFERENCES users (id),
    category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT CHECK (type IN ('Income','Expense')) NOT NULL,
    frequency TEXT CHECK (frequency IN ('Daily','Weekly','Monthly','Yearly')) NOT NULL,
    month INTEGER, -- yearly frequency month (1-12)
    day_of_month INTEGER, -- monthly / yearly
    day_of_week INTEGER, -- 0-6 weekly
    time_of_day TEXT, -- HH:mm:ss
    start_date TEXT NOT NULL, -- YYYY-MM-DD HH:mm:ss
    end_date TEXT, -- YYYY-MM-DD HH:mm:ss
    max_occurrences INTEGER,
    occurrences_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

-- Many-to-many: recurring_transactions <-> tags
CREATE TABLE recurring_transaction_tags (
    recurring_transaction_id INTEGER NOT NULL REFERENCES recurring_transactions (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (recurring_transaction_id, tag_id)
);

CREATE TABLE recurring_transaction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurring_transaction_id INTEGER NOT NULL REFERENCES recurring_transactions (id),
    generated_transaction_id INTEGER UNIQUE REFERENCES transactions (id) ON DELETE SET NULL,
    execution_time TEXT NOT NULL, -- YYYY-MM-DD HH:mm:ss
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_users_family_id ON users (family_id);
CREATE INDEX idx_users_email ON users (email);

CREATE INDEX idx_accounts_family_id ON accounts (family_id);
CREATE INDEX idx_accounts_type ON accounts (account_type);

CREATE INDEX idx_account_balances_account_id_date ON account_balances (account_id, date DESC);

CREATE INDEX idx_categories_family_id ON categories (family_id);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);

CREATE INDEX idx_tags_family_id ON tags (family_id);

CREATE INDEX idx_transactions_account_id_date ON transactions (account_id, date DESC);
CREATE INDEX idx_transactions_user_id ON transactions (user_id);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_deleted_at ON transactions (deleted_at);

CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags (transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags (tag_id);

CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions (account_id);
CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions (user_id);
CREATE INDEX idx_recurring_transactions_type ON recurring_transactions (type);

CREATE INDEX idx_recurring_transaction_tags_recurring_id ON recurring_transaction_tags (recurring_transaction_id);
CREATE INDEX idx_recurring_transaction_tags_tag_id ON recurring_transaction_tags (tag_id);

CREATE INDEX idx_recurring_logs_recurring_id ON recurring_transaction_logs (recurring_transaction_id);
CREATE INDEX idx_recurring_logs_generated_id ON recurring_transaction_logs (generated_transaction_id);