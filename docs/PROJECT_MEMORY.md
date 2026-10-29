# ABMS & Nexora Bank — Project Memory & Architecture Blueprint

## 1. System Overview & Core Philosophy

**ABMS (Advanced Bank Management System)**, operating under the brand **Nexora Bank**, is a full-stack digital core banking web application. It combines traditional checking and savings accounts with innovative hybrid credit-debit cards, rule-based algorithmic safety controls, and multi-party parental approval workflows.

### Core Innovations
1. **Smart Hybrid Card (Dual-Rail Debit + Revolving Credit in One)**:
   - Merges a customer's liquid debit account balance with an approved revolving credit limit onto a single 16-digit card and PIN.
   - Dynamically routes card payments to liquid debit first and approved credit line second.
2. **Smart Safe Limit Engine**:
   - Allows users to designate a protected liquid checking/savings threshold (e.g. ₹15,000 or $400).
   - Card payments draw from disposable debit funds strictly *above* the safe limit. Any excess is routed seamlessly to the revolving credit facility without manual split intervention.
3. **Under-18 Minor Account Supervision & Parental Authorizations**:
   - Minor accounts (under 18) are linked to a verified parent/guardian.
   - Card purchases or transfers exceeding a configurable threshold (e.g. ₹2,000 or $25) are paused in `PENDING_APPROVAL` status.
   - Parents receive immediate real-time notifications with full merchant and amount details, with 1-click Approve or Decline.
4. **Audit-Grade Ledger & Receipts**:
   - Complete tracking of balances before and after each split allocation in `payment_allocations`.
   - Printable receipts itemizing debit deducted, credit charged, safe limit preserved, and parental approvals.
5. **Multi-Role Personas with 1-Click Evaluation**:
   - `ADMIN`: System metrics, account freeze/unfreeze, credit limit overrides, compliance audit logs.
   - `PARENT`: Dependent supervision, live child balance tracking, approval queue, threshold configuration.
   - `MINOR`: Under-18 banking experience triggering parental review workflows on high-value payments.
   - `CUSTOMER`: Standard adult customer utilizing hybrid cards, UPI scan-and-pay, safe limit sliders, and statements.

---

## 2. Technical Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 19 (`react`, `react-dom`) | Modern component architecture, functional hooks |
| **Bundler & Dev Server** | Vite 8 (`@vitejs/plugin-react`) | Fast HMR, proxy to backend `/api` at `http://localhost:5000` |
| **Styling & Design System** | Custom FinTech CSS (`nexora.css`, `index.css`) | Glassmorphic cards, modern typography, responsive layout |
| **Icons & Visuals** | `lucide-react` | Standard banking and UI iconography |
| **QR & Scanner** | `qrcode`, `jsqr` | UPI QR generation and camera/file-based decoding |
| **Backend Runtime** | Node.js (CommonJS) | Node v22 |
| **API Framework** | Express 5 (`express`) | Modular routes mounted under `/api` |
| **Primary Database** | SQLite via `better-sqlite3` | Zero-dependency, file-based (`abms.db`) with WAL mode & Foreign Keys |
| **Cloud Synchronization** | `@supabase/supabase-js` | Real-time cloud database mirroring for accounts, transactions, and users |
| **Security & Auth** | JWT (`jsonwebtoken`), `bcryptjs` | Bearer token auth, role-based authorization middleware |

---

## 3. Directory Layout

```
ABMS/
├── backend/
│   ├── .env                    # Local environment secrets (PORT, JWT_SECRET, SUPABASE_*, GOOGLE_*)
│   ├── .env.example            # Environment template for developers (placeholders only)
│   ├── package.json            # Node backend dependencies
│   ├── server.js               # Express application entry point & route registration
│   ├── supabase.js             # Supabase cloud client initialization
│   ├── database/
│   │   ├── abms.db             # SQLite database file
│   │   ├── db.js               # Database schema definition, pragmas & initial seed
│   │   └── seed_alex.js        # Seed script for Alex Mathew demo persona
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT authentication & requireRole authorization
│   ├── routes/
│   │   ├── accounts.js         # Account balances, lookup, deposit, withdrawal, transfer
│   │   ├── admin.js            # Admin metrics, user status toggles, credit overrides, audit logs
│   │   ├── auth.js             # User login, registration, Google auth, demo user listing
│   │   ├── cards.js            # Card details, safe-limit config, PIN change, freeze/unfreeze, payment
│   │   ├── credit.js           # Credit status, outstanding balance, credit repayment
│   │   ├── notifications.js    # User notification feed & mark-read endpoints
│   │   ├── parental.js         # Linked children, approval requests, approve/reject, threshold updates
│   │   └── transactions.js     # Transaction ledger, filtering, receipt generation, CSV export
│   ├── scripts/
│   │   └── seed_supabase.js    # Cloud database seeder
│   └── services/
│       ├── auditService.js     # Compliance audit logging to audit_logs table
│       ├── cardAllocationService.js # Smart split logic: debit vs credit allocation engine
│       ├── notificationService.js  # Push in-app notifications
│       └── supabaseSync.js    # Asynchronous mirroring to Supabase cloud tables
├── frontend/
│   ├── .env                    # Vite client env (VITE_SUPABASE_*, VITE_GOOGLE_*)
│   ├── .env.example            # Client env template (placeholders only)
│   ├── vite.config.js          # Vite configuration with proxy to port 5000
│   ├── package.json            # Frontend React dependencies
│   ├── index.html              # HTML shell
│   └── src/
│       ├── main.jsx            # React root mount
│       ├── App.jsx             # Top-level application shell, tab routing & modal management
│       ├── api.js              # Token management & fetch wrapper
│       ├── supabase.js         # Client Supabase client
│       ├── index.css           # Global typography & base rules
│       ├── nexora.css          # Nexora FinTech design system classes & variables
│       └── components/
│           ├── AdminPortal.jsx          # Admin KPI dashboard, user controls & compliance audit table
│           ├── AuthModal.jsx            # Login/Register modal
│           ├── CardPaymentSimulator.jsx # POS checkout simulator with live split preview
│           ├── HybridCardWidget.jsx     # 3D interactive physical card, PIN & freeze controls
│           ├── LoginPage.jsx            # Nexora authentication page & demo persona selector
│           ├── Navbar.jsx               # Top bar navigation & persona switcher
│           ├── NexoraDashboard.jsx      # Main banking dashboard (hero balance, actions, recent transactions)
│           ├── NexoraHeader.jsx         # App header with search, notifications & profile
│           ├── NexoraSidebar.jsx        # Navigation sidebar with responsive mobile drawer
│           ├── NexoraViews.jsx          # Tab views: Accounts, Money Transfer, Fixed Deposits, Loans, Support
│           ├── ParentPortal.jsx         # Parental supervision portal & authorization queue
│           ├── QuickActionsModal.jsx    # Deposit, Withdraw, Transfer & Repay modal
│           ├── ReceiptModal.jsx         # Detailed split allocation receipt modal & print
│           ├── SafeLimitControl.jsx     # Interactive Safe Limit configuration & live test slider
│           ├── ScanAndPayModal.jsx      # QR code scanner, UPI generator & payment execution
│           └── TransactionHistory.jsx   # Searchable, filterable transaction ledger with CSV export
└── docs/
    └── PROJECT_MEMORY.md       # This comprehensive architecture blueprint
```

---

## 4. Database Schema Reference

All tables are managed in SQLite via `backend/database/db.js` with foreign keys enabled (`PRAGMA foreign_keys = ON`) and WAL mode enabled (`PRAGMA journal_mode = WAL`):

1. **`users`**:
   - `id`, `name`, `email` (UNIQUE), `password` (bcrypt hash), `role` (`CUSTOMER`, `PARENT`, `MINOR`, `ADMIN`), `dob`, `phone`, `status` (`ACTIVE`, `FROZEN`, `SUSPENDED`), `created_at`.
2. **`accounts`**:
   - `id`, `user_id` (FK `users.id`), `account_number` (UNIQUE), `account_type` (`SAVINGS`, `CHECKING`), `balance`, `currency` (default `'INR'`), `status` (`ACTIVE`, `FROZEN`), `created_at`.
3. **`hybrid_cards`**:
   - `id`, `account_id` (FK `accounts.id`), `user_id` (FK `users.id`), `card_number` (UNIQUE), `card_holder_name`, `expiry_month`, `expiry_year`, `cvv`, `pin`, `credit_limit`, `available_credit`, `status` (`ACTIVE`, `FROZEN`, `BLOCKED`), `created_at`.
4. **`safe_limits`**:
   - `id`, `user_id` (FK `users.id`), `account_id` (FK `accounts.id`), `safe_limit_amount`, `is_enabled` (0/1), `updated_at`, `UNIQUE(user_id, account_id)`.
5. **`parent_child_links`**:
   - `id`, `parent_user_id` (FK `users.id`), `minor_user_id` (FK `users.id`), `relationship`, `requires_approval_above`, `status` (`PENDING`, `VERIFIED`, `REVOKED`), `created_at`, `UNIQUE(parent_user_id, minor_user_id)`.
6. **`parental_approval_requests`**:
   - `id`, `request_code` (UNIQUE), `minor_user_id` (FK `users.id`), `parent_user_id` (FK `users.id`), `account_id` (FK `accounts.id`), `card_id` (FK `hybrid_cards.id` nullable), `amount`, `merchant`, `purpose`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`), `rejection_reason`, `expires_at`, `resolved_at`, `created_at`.
7. **`transactions`**:
   - `id`, `reference_id` (UNIQUE), `user_id` (FK `users.id`), `account_id` (FK `accounts.id`), `card_id` (FK `hybrid_cards.id`), `type` (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`, `HYBRID_CARD_PURCHASE`, `CREDIT_REPAYMENT`), `total_amount`, `debit_portion`, `credit_portion`, `recipient_info`, `description`, `status` (`SUCCESS`, `PENDING_APPROVAL`, `REJECTED`, `EXPIRED`, `FAILED`), `failure_reason`, `parental_approval_id` (FK `parental_approval_requests.id`), `created_at`.
8. **`payment_allocations`**:
   - `id`, `transaction_id` (FK `transactions.id`), `requested_amount`, `safe_limit_active`, `safe_limit_value`, `debit_balance_before`, `debit_deducted`, `debit_balance_after`, `credit_limit_before`, `credit_deducted`, `credit_limit_after`, `allocation_notes`, `created_at`.
9. **`notifications`**:
   - `id`, `user_id` (FK `users.id`), `title`, `message`, `type` (`TRANSACTION`, `APPROVAL_REQUEST`, `SAFE_LIMIT_ALERT`, `LOW_CREDIT`, `SYSTEM`), `is_read`, `metadata`, `created_at`.
10. **`credit_repayments`**:
    - `id`, `user_id` (FK `users.id`), `card_id` (FK `hybrid_cards.id`), `account_id` (FK `accounts.id`), `amount`, `payment_method`, `status`, `created_at`.
11. **`audit_logs`**:
    - `id`, `user_id` (FK `users.id`), `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`.

---

## 5. Seeded Demo Personas (Password: `bank1234`)

| Role | Name | Email | Accounts & Balances | Card & Limits | Key Behavioral Flow |
|---|---|---|---|---|---|
| **CUSTOMER** | Alex Mathew | `alex@nexora.bank` | Savings (₹1,02,450), Current (₹22,300), FD (₹24,000) | Card: 4152-7788-9900-4582, Limit: ₹2,00,000, Safe Limit: ₹15,000 | Primary persona; tests full dashboard, UPI QR scan, Safe Limit split engine |
| **CUSTOMER** | Sarah Connor | `customer@abms.bank` | Checking ($1,250.00) | Card: 4152-7733-4411-8822, Limit: $3,000, Safe Limit: $400 | Standard adult customer; tests split allocations on POS payments |
| **PARENT** | John Davis | `parent@abms.bank` | Savings ($6,500.00) | Card: 4152-8890-1234-5678, Limit: $5,000, Safe Limit: $1,000 | Supervises Leo Davis; approves or rejects pending minor requests |
| **MINOR** | Leo Davis | `minor@abms.bank` | Savings ($350.00) | Card: 4152-9910-9876-5432, Limit: $300, Safe Limit: $50 | Under-18; payments > $25 trigger parental authorization |
| **ADMIN** | System Admin | `admin@abms.bank` | - | - | Bank oversight; monitors bank deposits, freezes accounts, audits logs |

---

## 6. Smart Safe Limit Split Engine Algorithm

When a card purchase of amount $A$ is made for a card with debit balance $D$, available credit limit $C$, safe limit threshold $S$, and safe limit active flag $E$:

1. Compute disposable debit balance:
   $$\text{DisposableDebit} = \begin{cases} \max(0, D - S) & \text{if } E \text{ is enabled} \\ D & \text{if } E \text{ is disabled} \end{cases}$$
2. Calculate debit portion deducted:
   $$\text{DebitPortion} = \min(A, \text{DisposableDebit})$$
3. Calculate remaining amount required on credit:
   $$\text{CreditNeeded} = A - \text{DebitPortion}$$
4. Validation:
   - If $\text{CreditNeeded} \le C$: Transaction is approved (or routed to parental review if minor).
   - If $\text{CreditNeeded} > C$: Transaction is declined due to insufficient combined purchasing power.
5. In an atomic transaction:
   - Debit account is debited by $\text{DebitPortion}$.
   - Available credit is decreased by $\text{CreditNeeded}$.
   - Full before-and-after audit snapshot is persisted to `payment_allocations`.
   - Notifications and alerts are triggered (e.g. low credit alert if credit balance $< 20\%$).
