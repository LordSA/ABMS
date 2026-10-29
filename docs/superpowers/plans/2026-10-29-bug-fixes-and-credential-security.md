# Bug Fixes, Credential Security & System Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean all exposed credentials from code and example files into `.env`, fix all syntax and build errors, repair the parental approval duplicate transaction and minor transfer bugs, correct broken UI endpoints, and verify full end-to-end functionality across all personas.

**Architecture:** Secure environment variable isolation for backend and client with safe fallbacks; atomic SQLite transactions ensuring single-record ledger consistency during parental approval settlement; client-side blob streaming for authenticated statement downloads; and reactive state alignment across persona switching.

**Tech Stack:** Node.js, Express 5, better-sqlite3 (WAL mode), React 19, Vite 8, Lucide React, JWT, bcryptjs.

**Spec:** `docs/PROJECT_MEMORY.md`

## Global Constraints
- All database modifications must use atomic `better-sqlite3` transactions.
- Zero credentials or secrets in `.env.example` or frontend code bundles; secrets belong strictly in untracked `.env`.
- Preserve existing styling and FinTech UI design in `frontend/src/nexora.css`.
- The frontend must pass `npm run lint` (`oxlint`) and `npm run build` (`vite build`) with zero errors.
- The backend must start and pass health check and integration tests without errors.

## Review Focus
1. **Parental Approval Ledger Integrity**: When a parent approves a minor's held transaction, verify that exactly one `SUCCESS` transaction exists in the ledger with proper debit/credit split amounts, with no ghost or duplicate records.
2. **Minor Transfer Approval Flow**: When a minor submits a bank transfer exceeding the approval threshold (where `card_id` is null), verify that parent approval successfully executes the inter-account transfer and credits the recipient's balance.
3. **Frontend Build & Linter**: Verify that `frontend/vite.config.js` duplicate export is resolved and `npm run build` generates `dist/` cleanly.
4. **Credential Isolation**: Confirm that neither `frontend/src/supabase.js`, `backend/.env.example`, nor `frontend/.env.example` expose live Supabase secrets or keys.
5. **CSV Statement Download Authentication**: Verify that clicking "Export CSV Statement" passes the JWT Bearer token and triggers file download rather than returning a 401 Unauthorized error.

---

### Task 1: Credential Isolation & Environment Hardening

**Files:**
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`
- Modify: `frontend/src/supabase.js`
- Modify: `backend/supabase.js`
- Modify: `backend/middleware/authMiddleware.js`

**Interfaces:**
- Consumes: `process.env.SUPABASE_URL`, `process.env.SUPABASE_SECRET_KEY`, `process.env.SUPABASE_PUBLISHABLE_KEY`, `process.env.JWT_SECRET`, `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY`.
- Produces: Sanitized `.env.example` files; safe graceful fallback in `backend/supabase.js` and `frontend/src/supabase.js` when Supabase is not configured; guaranteed `dotenv` load before `JWT_SECRET` evaluation in `authMiddleware.js`.

- [ ] **Step 1: Sanitize `backend/.env.example` and `frontend/.env.example`**
  - Replace real Supabase project URL and API keys in `backend/.env.example` and `frontend/.env.example` with placeholder values (`your_supabase_url_here`, `your_supabase_publishable_key_here`, `your_supabase_secret_key_here`).
  - Replace `JWT_SECRET` in `backend/.env.example` with `your_jwt_secret_key_here`.

- [ ] **Step 2: Clean hardcoded credential fallbacks from `frontend/src/supabase.js`**
  - Read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` strictly from `import.meta.env`.
  - Provide a safe dummy client or warning if credentials are empty so client-side initialization never crashes when unconfigured.

- [ ] **Step 3: Guard `backend/supabase.js` against missing credentials**
  - Check `if (!supabaseUrl || !supabaseKey)` and avoid calling `createClient(undefined, undefined)` which throws `supabaseUrl is required.` and crashes the server.
  - Export a mock/noop safe client if unconfigured so the backend runs offline on SQLite seamlessly.

- [ ] **Step 4: Ensure `backend/middleware/authMiddleware.js` loads dotenv**
  - Add `require('dotenv').config()` at the top of `authMiddleware.js` before `process.env.JWT_SECRET` is evaluated.

- [ ] **Step 5: Verify credentials isolation**
  - Search codebase to verify no secrets remain in tracked files or example files.

---

### Task 2: Vite Configuration & Frontend Build Fix

**Files:**
- Modify: `frontend/vite.config.js`
- Modify: `frontend/src/components/NexoraSidebar.jsx`

**Interfaces:**
- Consumes: Vite configuration schema, React component lifecycle.
- Produces: Valid ES module Vite config with single default export; lint-clean sidebar without re-declaring component types inside render.

- [ ] **Step 1: Fix duplicate default export in `frontend/vite.config.js`**
  - Merge the two `export default defineConfig(...)` blocks into a single config object:
    ```javascript
    export default defineConfig({
      plugins: [react()],
      server: {
        port: 3000,
        allowedHosts: ['probe-mule-mold.ngrok-free.dev'],
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true
          }
        }
      }
    });
    ```

- [ ] **Step 2: Fix `NexoraSidebar.jsx` component definition during render**
  - Refactor `SidebarContent` from an inline component declaration (`const SidebarContent = () => (...)`) to a helper render function `renderSidebarContent()` or extract it outside the main component, resolving the React compiler / Oxlint static-component warning.

- [ ] **Step 3: Run `npm run build` and `npm run lint` in `frontend/`**
  - Run: `cd frontend; npm run build`
  - Expected: PASS with zero build errors and successful output in `frontend/dist/`.

---

### Task 3: Parental Approval & Minor Transfer Settlement Fix

**Files:**
- Modify: `backend/services/cardAllocationService.js`
- Modify: `backend/routes/parental.js`
- Modify: `backend/routes/accounts.js`

**Interfaces:**
- Consumes: `parental_approval_requests`, `transactions`, `accounts`, `hybrid_cards`.
- Produces: Clean single-record transaction updates upon parental approval; support for approving minor debit/credit transfers.

- [ ] **Step 1: Fix duplicate transaction insertion in `executeSettlement` / `parental.js`**
  - In `cardAllocationService.js`, when `executeSettlement` is invoked with an `approvalId`:
    - Instead of inserting a second transaction row with `status = 'SUCCESS'`, update the existing transaction that has `parental_approval_id = approvalId` (updating its `reference_id`, `status = 'SUCCESS'`, `debit_portion`, `credit_portion`, etc.) and insert the `payment_allocations` record referencing that existing transaction ID.
    - Remove the redundant second `UPDATE transactions SET status = 'SUCCESS' ...` in `parental.js` to eliminate race conditions.

- [ ] **Step 2: Fix parental approval for Minor Fund Transfers in `backend/routes/parental.js`**
  - In `parental.js` `POST /approve/:requestId`:
    - Inspect the request: if `card_id` is null or if `request.purpose` indicates a transfer, handle it as a transfer approval rather than a card POS purchase.
    - Fetch the minor's account and destination recipient account (or recipient info from request).
    - Deduct funds from minor's account (or credit line if transfer was credit-based), credit the destination account, and update the transaction record to `SUCCESS`.
    - Allow approval even when `card_id` is null.

- [ ] **Step 3: Verify with automated test script**
  - Test scenario: Minor initiates card purchase > Parent approves > Ledger contains exactly one `SUCCESS` transaction with correct allocation.
  - Test scenario: Minor initiates debit transfer > Parent approves > Funds transferred to recipient and status set to `SUCCESS`.

---

### Task 4: Credit Repayments Join & Ledger Accuracy Fix

**Files:**
- Modify: `backend/routes/credit.js`
- Modify: `backend/database/db.js`

**Interfaces:**
- Consumes: `credit_repayments`, `transactions`.
- Produces: Correct relationship between repayment records and transactions.

- [ ] **Step 1: Fix join in `GET /api/credit/status` in `backend/routes/credit.js`**
  - In `credit_repayments` table, record `reference_id` or join using matching `user_id` and timestamp/reference rather than `t.id = r.id`.
  - Update `POST /api/credit/repay` to store `reference_id` or add `reference_id` column to `credit_repayments`.

- [ ] **Step 2: Verify `GET /api/credit/status` returns correct user repayments**
  - Test credit repayment API and verify returned history corresponds to the actual user's repayments.

---

### Task 5: Transaction Pagination & Filter Count Fix

**Files:**
- Modify: `backend/routes/transactions.js`

**Interfaces:**
- Consumes: Query params (`type`, `status`, `search`, `minAmount`, `maxAmount`, `limit`, `offset`).
- Produces: Exact total matching transaction count matching the active filter criteria.

- [ ] **Step 1: Update count query in `GET /api/transactions`**
  - Build the count query with the exact same WHERE filters and parameters as the selection query:
    ```javascript
    let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?';
    // Append type, status, minAmount, maxAmount, search filters to countQuery
    ```

- [ ] **Step 2: Test filtered count response**
  - Verify that querying `/api/transactions?type=DEPOSIT` returns `total` equal to the number of deposits, not the total unfiltered transaction count.

---

### Task 6: CSV Statement Export Authentication Fix

**Files:**
- Modify: `frontend/src/components/TransactionHistory.jsx`

**Interfaces:**
- Consumes: `getToken()` from `../api`, `GET /api/transactions/export/csv`.
- Produces: Authenticated CSV file download in the browser.

- [ ] **Step 1: Replace unauthenticated `window.open` with authenticated fetch in `TransactionHistory.jsx`**
  - Implement `handleDownloadCsv` using `fetch` with `Authorization: Bearer ${token}` header:
    ```javascript
    const handleDownloadCsv = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/transactions/export/csv', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Failed to download CSV statement');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ABMS_Statement_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.message);
      }
    };
    ```

- [ ] **Step 2: Verify CSV download works with valid JWT token**
  - Verify that clicking "Export CSV Statement" downloads the CSV file without 401 error.

---

### Task 7: Nexora Views & Dashboard Account State Binding Fix

**Files:**
- Modify: `frontend/src/components/NexoraViews.jsx`
- Modify: `frontend/src/components/NexoraDashboard.jsx`
- Modify: `backend/routes/accounts.js`

**Interfaces:**
- Consumes: User accounts array from `App.jsx`.
- Produces: Dynamic account selection in Fixed Deposits, Loans, and Dashboard accounts cards; dedicated account creation endpoint.

- [ ] **Step 1: Add `POST /api/accounts/create` in `backend/routes/accounts.js`**
  - Allow user to create an additional savings or current account with an initial deposit.
  - Update `AccountsView` "Open New Account" form to call `POST /api/accounts/create`.

- [ ] **Step 2: Fix hardcoded `accountId: 1` in `FixedDepositsView` and `LoansView`**
  - Accept `accounts` prop in `FixedDepositsView` and `LoansView`.
  - Use `accounts[0]?.id` (or selected account ID) instead of hardcoded `accountId: 1`.

- [ ] **Step 3: Fix hardcoded accounts list in `NexoraDashboard.jsx`**
  - Update the "Your Accounts" card (lines 452-516) to map over `accounts` prop dynamically when available, so switching to Sarah Connor or John Davis shows their actual accounts instead of Alex Mathew's hardcoded numbers.

---

### Task 8: End-to-End Persona Verification & Self-Review

**Files:**
- Verify: Full stack (backend + frontend)

**Interfaces:**
- Consumes: All 4 persona accounts (Alex Mathew / Customer, John Davis / Parent, Leo Davis / Minor, Admin).
- Produces: Verified working application ready for user demonstration.

- [ ] **Step 1: Test Admin Persona (`admin@abms.bank`)**
  - Verify metrics, account freeze/unfreeze, credit override, audit logs.
- [ ] **Step 2: Test Customer Persona (`alex@nexora.bank` & `customer@abms.bank`)**
  - Verify dashboard balances, hybrid card widget, Safe Limit slider test, POS simulator checkout, quick actions deposit/transfer, statements CSV export.
- [ ] **Step 3: Test Minor Persona (`minor@abms.bank`)**
  - Attempt purchase exceeding limit > verify `PENDING_APPROVAL` status and alert sent to parent.
- [ ] **Step 4: Test Parent Persona (`parent@abms.bank`)**
  - Inspect pending queue > click Approve > verify transaction settles cleanly without duplication.
- [ ] **Step 5: Run final frontend build and backend health check**
  - Verify zero errors in `npm run build` and backend console.
