# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a mobile-first, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It allows users to record daily spending transactions, track a running balance, visualize spending by category via a Chart.js doughnut chart, manage custom categories, and review a monthly spending summary — all persisted in the browser's `localStorage` with no backend.

The implementation builds on three existing files:

| File | Current State | Action Required |
|---|---|---|
| `home.html` | Skeleton with structural bugs | Fix bugs, add missing sections |
| `css/style.css` | Minimal, per-element font rules, inaccessible background | Refactor to mobile-first responsive layout |
| `js/script.js` | `<script>` tags inside `.js` file, wrong `getElementById` casing | Rewrite as clean ES6 module-style script |

### Key Design Decisions

- **No framework**: Plain DOM APIs only. Chart.js is the sole external library, loaded via CDN.
- **Single source of truth**: `localStorage` is the persistence layer. In-memory arrays (`transactions`, `customCategories`) are always derived from it on load and kept in sync on every mutation.
- **Renderer pattern**: All UI updates go through dedicated renderer functions (`renderTransactionList`, `renderBalance`, `renderChart`, `renderMonthlySummary`). No direct DOM mutation outside renderers.
- **Validator pattern**: All input validation is centralized in a `Validator` object before any data is written.
- **Event delegation**: A single listener on the transaction list container handles delete button clicks, avoiding per-item listener leaks.

---

## Architecture

The app is a single HTML page with three files:

```
home.html          ← structure + Chart.js CDN script tag
css/style.css      ← mobile-first responsive styles
js/script.js       ← all application logic
```

### Module Responsibilities

```
js/script.js
├── Storage        — read/write localStorage, handle quota/parse errors
├── Validator      — validate form inputs and custom category inputs
├── Transactions   — in-memory array, add/delete operations
├── Categories     — built-in + custom category management
├── Renderer       — DOM update functions (list, balance, chart, summary)
├── Chart          — Chart.js instance lifecycle (create/update/destroy)
├── Sorter         — pure sort functions (no localStorage mutation)
└── App.init()     — bootstrap: load data, bind events, initial render
```

### Data Flow

```
User Action
    │
    ▼
Validator.validate()
    │ valid
    ▼
Transactions.add() / Transactions.delete()
    │
    ▼
Storage.save("transactions", [...])
    │
    ▼
Renderer.renderAll()   ← renderTransactionList + renderBalance + renderChart + renderMonthlySummary
```

### Event Binding Summary

| Event | Element | Handler |
|---|---|---|
| `submit` | `#AddTransaction` | `handleAddTransaction` |
| `click` (delegated) | `#transactionList` | `handleDeleteTransaction` |
| `change` | `#sortSelect` | `handleSortChange` |
| `click` | `#addCategoryBtn` | `handleAddCategory` |

---

## Components and Interfaces

### HTML Structure (`home.html`)

After bug fixes and feature additions, `home.html` will contain these sections in order:

```html
<!-- 1. Storage unavailability banner (hidden by default) -->
<div id="storageBanner" class="banner hidden"></div>

<!-- 2. Page heading -->
<h1>My Expense and Budget Visualizer</h1>

<!-- 3. Balance display -->
<section id="balanceSection">
  <h2>Total Balance</h2>
  <p id="Balance">Rp 0</p>
</section>

<!-- 4. Add Transaction form -->
<section id="addTransactionSection">
  <h2>Add Transaction</h2>
  <form id="AddTransaction" novalidate>
    <label for="itemName">Item Name</label>
    <input type="text" id="itemName" name="itemName" maxlength="100" placeholder="Item Name" required>
    <span class="error-msg" id="itemNameError"></span>

    <label for="priceAmount">Amount (in Rupiah)</label>
    <input type="number" id="priceAmount" name="priceAmount" min="0.01" max="999999999.99" placeholder="Amount" required>
    <span class="error-msg" id="priceAmountError"></span>

    <label for="Category">Category</label>
    <select id="Category" name="Category" required>
      <option value="Food">Food</option>
      <option value="Transport">Transport</option>
      <option value="Fun">Fun</option>
      <option value="Others">Others</option>
    </select>
    <span class="error-msg" id="categoryError"></span>

    <button type="submit">Add Transaction</button>
  </form>
</section>

<!-- 5. Custom Category input -->
<section id="customCategorySection">
  <h2>Add Custom Category</h2>
  <input type="text" id="customCategoryInput" maxlength="50" placeholder="Category name">
  <span class="error-msg" id="customCategoryError"></span>
  <button id="addCategoryBtn">Add Category</button>
</section>

<!-- 6. Sort control + Transaction list -->
<section id="transactionSection">
  <h2>Transaction List</h2>
  <label for="sortSelect">Sort by:</label>
  <select id="sortSelect">
    <option value="date-desc">Date (Newest First)</option>
    <option value="amount-desc">Amount (High to Low)</option>
    <option value="amount-asc">Amount (Low to High)</option>
    <option value="category-az">Category (A–Z)</option>
  </select>
  <ul id="transactionList"></ul>
</section>

<!-- 7. Category chart -->
<section id="chartSection">
  <h2>Spending by Category</h2>
  <p id="chartPlaceholder" class="hidden">Add transactions to see your spending chart.</p>
  <canvas id="spendingChart"></canvas>
</section>

<!-- 8. Monthly summary -->
<section id="monthlySummarySection">
  <h2>Monthly Summary</h2>
  <ul id="monthlySummaryList"></ul>
</section>

<!-- Script loaded last with defer -->
<script src="js/script.js" defer></script>
```

**Bug fixes applied:**
- `<link rel="script">` → `<script src="js/script.js" defer>` (Requirement 1.1)
- Duplicate category inputs (select + radio group) → single `<select id="Category">` (Requirement 1.4)
- Dangling `<label>Category</label>` and unlabelled `<input type="text">` removed (Requirements 1.4, 1.5)
- `id="Balance"` retained for backward compatibility (Requirement 3.1)

### JavaScript Interfaces (`js/script.js`)

#### Storage Module

```javascript
const Storage = {
  load(key, fallback = []) { /* JSON.parse with try/catch; returns fallback on error */ },
  save(key, value) { /* JSON.stringify + localStorage.setItem; throws on quota exceeded */ },
  isAvailable() { /* test-write to detect private-mode or disabled localStorage */ }
};
```

#### Validator Module

```javascript
const Validator = {
  validateTransaction(name, amount, category) {
    // Returns { valid: boolean, errors: { name?, amount?, category? } }
  },
  validateCustomCategory(name, existingCategories) {
    // Returns { valid: boolean, error: string | null }
  }
};
```

#### Transactions Module

```javascript
const Transactions = {
  items: [],   // in-memory array, source of truth after load
  load() { /* populate from Storage */ },
  add(transaction) { /* push + Storage.save */ },
  delete(id) { /* filter + Storage.save */ },
  getAll() { return [...this.items]; }
};
```

#### Categories Module

```javascript
const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun', 'Others'];

const Categories = {
  custom: [],
  load() { /* populate from Storage */ },
  add(name) { /* push + Storage.save */ },
  getAll() { return [...BUILT_IN_CATEGORIES, ...this.custom]; }
};
```

#### Sorter Module

```javascript
const Sorter = {
  sort(transactions, mode) {
    // mode: 'date-desc' | 'amount-desc' | 'amount-asc' | 'category-az'
    // Returns new sorted array; does NOT mutate input
    // Secondary sort: date descending for ties
  }
};
```

#### Renderer Module

```javascript
const Renderer = {
  renderTransactionList(transactions) { /* rebuild #transactionList */ },
  renderBalance(transactions) { /* sum amounts, format as Rupiah, update #Balance */ },
  renderChart(transactions) { /* aggregate by category, update Chart instance */ },
  renderMonthlySummary(transactions) { /* group by YYYY-MM, sort desc, update list */ },
  renderAll(transactions) { /* calls all four above */ },
  formatRupiah(amount) { /* returns "Rp X.XXX" with period thousands separator */ },
  formatDate(isoString) { /* returns "DD/MM/YYYY" */ },
  formatMonth(isoString) { /* returns "MMMM YYYY" e.g. "May 2025" */ }
};
```

#### Chart Module

```javascript
const ChartManager = {
  instance: null,
  COLORS: [/* fixed palette of 12 distinct colors for built-in + custom categories */],
  init(canvasId) { /* create Chart.js doughnut instance */ },
  update(categoryTotals) { /* update data + call chart.update() */ },
  destroy() { /* cleanup on re-init */ }
};
```

#### App Bootstrap

```javascript
const App = {
  currentSort: 'date-desc',
  init() {
    if (!Storage.isAvailable()) { showStorageBanner('unavailable'); }
    Transactions.load();
    Categories.load();
    populateCategoryDropdown();
    ChartManager.init('spendingChart');
    Renderer.renderAll(Transactions.getAll());
    bindEvents();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
```

---

## Data Models

### Transaction Object

```javascript
{
  id: string,          // crypto.randomUUID() or Date.now().toString() fallback
  name: string,        // 1–100 characters, trimmed
  amount: number,      // positive float, > 0, ≤ 999999999.99
  category: string,    // one of Categories.getAll()
  date: string         // ISO 8601 timestamp, e.g. "2025-05-26T10:30:00.000Z"
}
```

### Custom Category Entry

```javascript
string   // category name, 1–50 characters, trimmed, case-insensitively unique
```

### localStorage Schema

| Key | Type | Description |
|---|---|---|
| `"transactions"` | `JSON string → Transaction[]` | All recorded transactions |
| `"customCategories"` | `JSON string → string[]` | User-defined category names |

### Rupiah Formatting

The `formatRupiah` function converts a numeric amount to the Indonesian Rupiah display format:

```
12345.67  →  "Rp 12.345"   (integer display, period as thousands separator)
0         →  "Rp 0"
50000     →  "Rp 50.000"
```

Amounts are stored as raw numbers; formatting is applied only at render time.

### Category Color Palette

Chart.js segments are assigned colors from a fixed palette. Built-in categories get the first four slots; custom categories cycle through the remaining slots:

```javascript
const PALETTE = [
  '#FF6384', // Food
  '#36A2EB', // Transport
  '#FFCE56', // Fun
  '#4BC0C0', // Others
  '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4',
  '#E7E9ED', '#EA526F', '#25CED1', '#FCEADE'
];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Item Name Validation Rejects Invalid Inputs

*For any* string submitted as an item name, the Validator SHALL accept it if and only if the trimmed string has length ≥ 1. Any empty string or string composed entirely of whitespace characters SHALL be rejected.

**Validates: Requirements 2.2, 2.4**

---

### Property 2: Amount Validation Enforces Numeric Range

*For any* value submitted as an amount, the Validator SHALL accept it if and only if it is a finite number greater than 0 and no greater than 999,999,999.99. Non-numeric strings, zero, negative numbers, and values above the maximum SHALL all be rejected.

**Validates: Requirements 2.3, 2.5**

---

### Property 3: Transaction Creation Produces Correct Object Shape

*For any* valid combination of item name, amount, and category, the resulting Transaction object SHALL contain: a non-empty string `id`, a `name` equal to the trimmed input, a numeric `amount` equal to the input amount, a `category` equal to the selected category, and a `date` field that is a valid ISO 8601 timestamp string.

**Validates: Requirements 2.7, 7.6**

---

### Property 4: Transaction Add/Delete Persistence Round-Trip

*For any* sequence of add and delete operations on transactions, the array stored in `localStorage["transactions"]` SHALL always equal the current in-memory transaction array (serialized as JSON). Reading back and deserializing the stored value SHALL produce an array equivalent to the in-memory state.

**Validates: Requirements 2.8, 4.6, 9.1, 9.3**

---

### Property 5: Balance Always Equals Sum of All Transaction Amounts

*For any* array of transactions (including the empty array), the value displayed in the `#Balance` element SHALL equal the sum of all transaction amounts formatted as Indonesian Rupiah. This invariant SHALL hold after every add, delete, and page load operation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

---

### Property 6: Rupiah Formatting Is Correct for All Non-Negative Integers

*For any* non-negative integer amount, the `formatRupiah` function SHALL return a string beginning with `"Rp "` followed by the integer value with a period (`.`) as the thousands separator and no decimal places (e.g., `50000 → "Rp 50.000"`, `0 → "Rp 0"`).

**Validates: Requirements 3.4, 7.2**

---

### Property 7: Transaction List Render Displays All Required Fields

*For any* non-empty array of transactions stored in localStorage, after calling `renderTransactionList`, every transaction SHALL appear in the DOM with its item name, amount formatted as Rupiah, category label, and date formatted as `DD/MM/YYYY`. Every rendered item SHALL also contain a delete button.

**Validates: Requirements 4.1, 4.2, 4.5**

---

### Property 8: Chart Data Reflects Category Totals with No Zero Segments

*For any* array of transactions, the Chart.js dataset SHALL contain exactly one data point per category that has a total spending amount greater than zero. The data value for each such category SHALL equal the sum of all transaction amounts in that category. Categories with zero total spending SHALL NOT appear in the chart data or legend.

**Validates: Requirements 5.2, 5.5**

---

### Property 9: Custom Category Add Round-Trip

*For any* valid custom category name (1–50 non-whitespace characters, case-insensitively unique among all existing categories), after adding it: (a) `localStorage["customCategories"]` SHALL contain the new name, and (b) the `#Category` select element SHALL contain a new `<option>` with that name as its value and label.

**Validates: Requirements 6.2, 6.3, 9.2**

---

### Property 10: Custom Category Name Validation

*For any* string submitted as a custom category name, the Validator SHALL reject it if: (a) the trimmed string is empty, (b) the trimmed string exceeds 50 characters, or (c) the trimmed string matches any existing built-in or custom category name case-insensitively. All other strings SHALL be accepted.

**Validates: Requirements 6.4, 6.5**

---

### Property 11: Chart Segments Have Distinct Colors

*For any* set of categories (built-in plus any number of custom categories up to the palette size), all segments rendered in the Chart SHALL have distinct fill colors — no two segments in the same chart SHALL share the same color value.

**Validates: Requirements 6.6**

---

### Property 12: Monthly Summary Correctness, Format, and Order

*For any* array of transactions spanning one or more calendar months, the Monthly Summary SHALL: (a) list exactly those months that contain at least one transaction, (b) display each month label in `MMMM YYYY` format, (c) display each month's total as the sum of all transaction amounts in that month formatted as Rupiah, and (d) list months in descending chronological order (most recent first).

**Validates: Requirements 7.1, 7.2, 7.3**

---

### Property 13: Sort Correctness with Tie-Breaking

*For any* array of transactions and any sort mode (`date-desc`, `amount-desc`, `amount-asc`, `category-az`), the `Sorter.sort` function SHALL return a new array ordered by the primary sort key. When two or more transactions have equal primary sort key values, they SHALL be ordered by date descending as the secondary sort criterion. The original input array SHALL NOT be mutated.

**Validates: Requirements 8.2, 8.5**

---

## Error Handling

### localStorage Unavailability

Detected at startup via a test-write in `Storage.isAvailable()`. If unavailable:
- Show `#storageBanner` with message "Storage unavailable. Your data will not be saved."
- Initialize `Transactions.items = []` and `Categories.custom = []`
- App remains fully functional for the session (in-memory only)

### JSON Parse Errors on Load

Caught in `Storage.load()` via `try/catch` around `JSON.parse`. If parsing fails:
- Return the `fallback` value (empty array)
- Show `#storageBanner` with message "Saved data could not be read and has been reset."
- Overwrite the corrupted key with `"[]"` to prevent repeated errors

### Storage Quota Exceeded on Write

Caught in `Storage.save()` via `try/catch` around `localStorage.setItem`. If quota is exceeded:
- Re-throw a typed error (`StorageQuotaError`)
- Caller (`handleAddTransaction`) catches it and shows inline error "Storage full. Transaction could not be saved."
- The transaction is NOT added to `Transactions.items` and NOT rendered

### Delete Failure

If `Storage.save()` throws during a delete operation:
- The transaction is NOT removed from `Transactions.items`
- The Transaction_List is NOT re-rendered (state remains consistent)
- An inline error message is shown: "Could not delete transaction. Please try again."

### Custom Category Save Failure

If `Storage.save()` throws when adding a custom category:
- The category is NOT added to `Categories.custom`
- The `<option>` is NOT appended to the dropdown
- An inline error message is shown adjacent to the custom category input

### Input Validation Errors

All validation errors are displayed as inline `<span class="error-msg">` elements adjacent to the offending field. Errors are cleared on the next valid submission or when the field value changes.

---

## Testing Strategy

### Overview

The testing approach uses two complementary layers:

1. **Unit / Example-based tests** — verify specific behaviors, error conditions, and edge cases
2. **Property-based tests** — verify universal invariants across randomly generated inputs

The property-based testing library for this project is **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript/TypeScript), which integrates with any test runner. Tests will run with **Jest** as the test runner.

Each property test is configured to run a minimum of **100 iterations**.

### Test File Structure

```
tests/
├── unit/
│   ├── validator.test.js       — example-based validation tests
│   ├── renderer.test.js        — DOM rendering example tests
│   ├── storage.test.js         — error handling examples
│   └── app.test.js             — integration examples (init, form submit)
└── property/
    ├── validator.property.test.js   — Properties 1, 2, 10
    ├── transaction.property.test.js — Properties 3, 4, 5, 7
    ├── formatting.property.test.js  — Properties 6, 12
    ├── chart.property.test.js       — Properties 8, 11
    ├── category.property.test.js    — Properties 9, 10
    └── sorter.property.test.js      — Property 13
```

### Property Test Configuration

Each property test must be tagged with a comment referencing the design property:

```javascript
// Feature: expense-budget-visualizer, Property 1: Item Name Validation Rejects Invalid Inputs
test('Property 1: name validation', () => {
  fc.assert(
    fc.property(fc.string(), (name) => {
      const result = Validator.validateTransaction(name, 100, 'Food');
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        expect(result.valid).toBe(false);
        expect(result.errors.name).toBeTruthy();
      } else {
        expect(result.errors.name).toBeFalsy();
      }
    }),
    { numRuns: 100 }
  );
});
```

### Unit Test Coverage Targets

| Area | Test Type | Key Scenarios |
|---|---|---|
| Bug fixes (Req 1) | SMOKE | Script tag, no `<script>` in .js, correct getElementById, no duplicate inputs |
| Form structure (Req 2.1) | EXAMPLE | Form has all required fields |
| Form reset (Req 2.10) | EXAMPLE | Fields cleared after valid submit |
| Balance overdrawn color (Req 3.6) | EXAMPLE | Red color when over budget |
| Empty list message (Req 4.3) | EDGE_CASE | "No transactions yet." displayed |
| Chart visibility (Req 5.3, 5.4) | EDGE_CASE | Canvas hidden/shown based on data |
| Custom category UI (Req 6.1) | EXAMPLE | Input and button exist |
| Sort default (Req 8.3) | EXAMPLE | Default sort is date-desc on load |
| localStorage unavailable (Req 9.4) | EXAMPLE | Banner shown, empty state |
| JSON parse error (Req 9.5) | EXAMPLE | Banner shown, empty state |
| Quota exceeded (Req 9.6) | EXAMPLE | Error shown, transaction not added |
| Monthly summary empty (Req 7.5) | EDGE_CASE | "No monthly data yet." displayed |

### Property Test Summary

| Property | fast-check Arbitraries | Iterations |
|---|---|---|
| P1: Name validation | `fc.string()` | 100 |
| P2: Amount validation | `fc.oneof(fc.float(), fc.string(), fc.constant(0), fc.constant(-1))` | 100 |
| P3: Transaction shape | `fc.tuple(fc.string({minLength:1}), fc.float({min:0.01,max:999999999.99}), fc.constantFrom(...categories))` | 100 |
| P4: Add/delete round-trip | `fc.array(transactionArb)` | 100 |
| P5: Balance invariant | `fc.array(transactionArb)` | 100 |
| P6: Rupiah formatting | `fc.integer({min:0, max:999999999})` | 100 |
| P7: List render fields | `fc.array(transactionArb, {minLength:1})` | 100 |
| P8: Chart data accuracy | `fc.array(transactionArb)` | 100 |
| P9: Custom category round-trip | `fc.string({minLength:1, maxLength:50})` | 100 |
| P10: Custom category validation | `fc.string()` | 100 |
| P11: Distinct chart colors | `fc.integer({min:0, max:8})` (custom category count) | 100 |
| P12: Monthly summary | `fc.array(transactionArb, {minLength:1})` | 100 |
| P13: Sort correctness | `fc.tuple(fc.array(transactionArb), fc.constantFrom('date-desc','amount-desc','amount-asc','category-az'))` | 100 |
