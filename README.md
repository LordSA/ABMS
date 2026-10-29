# ABMS – Advanced Bank Management System
> Next-Generation Core Banking with Smart Hybrid Cards, Safe Limit Protection, Parental Approvals, and Real-Time Ledger Tracking.

---

## 🌟 Key Innovations

1. **Smart Hybrid Card (Dual Debit + Revolving Credit in One)**
   - Single chip card combining checking debit and approved credit limits.
   - Dual tracking of liquid cash balance and available credit line.
   - 3D interactive physical card preview with CVV reveal, card number masking/unmasking, and PIN security controls.

2. **Smart Safe Limit Engine**
   - Allows users to specify a protected minimum debit balance (e.g. $400.00).
   - Card payments draw from disposable debit funds *above* the safe limit first.
   - Any overflow amount automatically routes to the approved credit line without manual intervention.
   - Includes an interactive **Live Split Simulation Preview** allowing users to test allocation scenarios.

3. **Parental Approval for Under-18 Accounts**
   - Minor accounts (under 18) are linked to a verified parent or guardian.
   - Purchases or transfers exceeding the configurable spending threshold are automatically held in `PENDING_APPROVAL` status.
   - Parents receive real-time notifications with full merchant and amount details, and can Approve or Decline with one click.
   - Payments only execute upon valid authorization within the expiration window.
   - Parents can supervise linked dependents' live balances, credit limits, and full transaction feeds.

4. **Transparent Audit-Grade Ledger & Receipt Generation**
   - Real-time search, multi-criteria filtering (Card Purchase, Deposit, Withdrawal, Transfer, Credit Repayments), and CSV statement download.
   - Official printable receipts showing the complete split breakdown (Debit deducted vs Credit charged, safe limit preserved, and parental signoff).

5. **Role-Based Portals & 1-Click Evaluation Switcher**
   - **Customer Portal**: Sarah Connor (Checking, $3,000 credit line, $400 safe limit).
   - **Parent Portal**: John Davis (Supervises minor Leo Davis, handles pending approvals).
   - **Minor Portal**: Leo Davis (Age 15, triggers parental approval workflow on card purchases).
   - **Admin Portal**: System Administrator (System KPIs, user account freeze/activate, credit limit overrides, and live compliance audit log stream).

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Node.js & Express REST API (`/backend`)
- **Database**: SQLite with WAL mode & Foreign Keys (`better-sqlite3`), zero external DB dependencies required.
- **Frontend**: React (Vite) with custom FinTech Design System (`/frontend`), CSS variables, glassmorphic panels, and Lucide icons.
- **Security**: JWT bearer token authentication, bcrypt password hashing, and atomic SQLite transaction commits.

---

## 🚀 Running the System

### 1. Backend Server
```bash
cd backend
npm install
node server.js
```
The server will run on **http://localhost:5000** and automatically initialize and seed the SQLite database (`abms.db`).

### 2. Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 👥 Pre-Configured Demo Personas (1-Click Switcher)

All accounts are pre-seeded with password: `bank1234`

| Persona | Name | Role | Key Features |
|---|---|---|---|
| 👑 **Admin** | System Administrator | `ADMIN` | User account management, credit overrides, audit logs |
| 👨‍👧 **Parent** | John Davis | `PARENT` | Dependent supervision, 1-click approvals, spending limits |
| 👦 **Minor** | Leo Davis | `MINOR` | Under-18 account, parental authorization triggers |
| 👩 **Customer**| Sarah Connor | `CUSTOMER` | Smart Hybrid Card, Safe Limit split simulator, POS checkout |

---

## 📊 Database Schema Summary

- `users`: User profiles, roles (`CUSTOMER`, `PARENT`, `MINOR`, `ADMIN`), status.
- `accounts`: Savings and checking accounts with balances and currency.
- `parent_child_links`: Verified parent-minor relationships and spending thresholds.
- `hybrid_cards`: Card numbers, PINs, CVVs, credit limits, available credit, card status.
- `safe_limits`: Minimum protected debit balance settings per account.
- `transactions`: Full transaction log with `debit_portion`, `credit_portion`, reference IDs, and statuses.
- `payment_allocations`: Deep audit log of before/after balances for every split transaction.
- `parental_approval_requests`: Pending authorization requests with codes and expiry timers.
- `notifications`: Real-time alerts for transactions, approvals, and safe limit warnings.
- `credit_repayments`: Tracking of card repayments from checking accounts.
- `audit_logs`: Bank compliance activity logging with IP addresses and actions.
