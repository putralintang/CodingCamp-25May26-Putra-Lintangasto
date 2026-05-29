# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement the Expense & Budget Visualizer as a mobile-first, single-page web application using plain HTML, CSS, and Vanilla JavaScript. The implementation starts by fixing existing bugs in the three source files, then progressively adds the Storage, Validator, Transactions, Categories, Sorter, Renderer, and ChartManager modules, wires them together in `App.init()`, and finally applies the responsive mobile-first CSS. Tests are co-located with each implementation step.

---

## Tasks

- [x] 1. Fix existing code bugs and set up project structure
  - [x] 1.1 Fix `home.html` structural bugs and add all required HTML sections
    - Replace `<link rel="script" href="js/script.js">` with `<script src="js/script.js" defer>`
    - Remove the radio button group, the dangling `<label>Category</label>`, and the unlabelled `<input type="text">` below the radio buttons
    - Retain only the `<select id="Category">` with built-in options: Food, Transport, Fun, Others
    - Add all missing sections in order: `#storageBanner`, `#balanceSection`, `#addTransactionSection`, `#customCategorySection`, `#transactionSection` (with `#sortSelect` and `#transactionList`), `#chartSection` (with `#spendingChart` canvas and `#chartPlaceholder`), `#monthlySummarySection` (with `#monthlySummaryList`)
    - Add Chart.js CDN `<script>` tag before the `defer` script tag
    - Add `novalidate` to the `<form id="AddTransaction">` element
    - Add all `<span class="error-msg">` elements adjacent to each form field
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 1.2 Rewrite `js/script.js` — remove `<script>` tags and fix `getElementById` casing
    - Remove all `<script>` and `</script>` tags from `js/script.js`
    - Replace `document.getElementbyId` with `document.getElementById` everywhere
    - Leave the file as a clean ES6-style script scaffold (empty module stubs for Storage, Validator, Transactions, Categories, Sorter, Renderer, ChartManager, App)
    - _Requirements: 1.2, 1.3_



- [x] 2. Implement the Storage module
  - [x] 2.1 Implement `Storage.isAvailable()`, `Storage.load()`, and `Storage.save()` in `js/script.js`
    - `isAvailable()`: test-write a sentinel key to detect private-mode or disabled localStorage; return boolean
    - `load(key, fallback)`: `JSON.parse(localStorage.getItem(key))`; return `fallback` on null or parse error; overwrite corrupted key with `"[]"` on parse error
    - `save(key, value)`: `localStorage.setItem(key, JSON.stringify(value))`; throw a typed `StorageQuotaError` on `QuotaExceededError`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_



- [x] 3. Implement the Validator module
  - [x] 3.1 Implement `Validator.validateTransaction()` in `js/script.js`
    - Accept `(name, amount, category)` parameters
    - Reject name if trimmed length is 0; accept otherwise
    - Reject amount if not a finite number, ≤ 0, or > 999,999,999.99; accept otherwise
    - Reject category if falsy/empty; accept otherwise
    - Return `{ valid: boolean, errors: { name?, amount?, category? } }`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Implement `Validator.validateCustomCategory()` in `js/script.js`
    - Accept `(name, existingCategories)` parameters
    - Reject if trimmed name is empty or exceeds 50 characters
    - Reject if trimmed name matches any existing category case-insensitively
    - Return `{ valid: boolean, error: string | null }`
    - _Requirements: 6.4, 6.5_



- [x] 4. Implement the Transactions and Categories modules
  - [x] 4.1 Implement `Transactions` module in `js/script.js`
    - `items`: in-memory array
    - `load()`: populate `items` from `Storage.load("transactions", [])`
    - `add(transaction)`: push to `items`, call `Storage.save("transactions", items)`; throw on quota error
    - `delete(id)`: filter `items`, call `Storage.save("transactions", items)`; revert filter on save error
    - `getAll()`: return shallow copy of `items`
    - Transaction object shape: `{ id, name, amount, category, date }` where `id` is `crypto.randomUUID()` or `Date.now().toString()` fallback
    - _Requirements: 2.7, 2.8, 4.6, 9.1, 9.3_

  - [x] 4.2 Implement `Categories` module in `js/script.js`
    - `BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun', 'Others']`
    - `custom`: in-memory array
    - `load()`: populate `custom` from `Storage.load("customCategories", [])`
    - `add(name)`: push trimmed name to `custom`, call `Storage.save("customCategories", custom)`; throw on save error
    - `getAll()`: return `[...BUILT_IN_CATEGORIES, ...custom]`
    - _Requirements: 6.2, 6.3, 9.2, 9.3_



- [x] 5. Implement the Sorter module
  - [x] 5.1 Implement `Sorter.sort()` in `js/script.js`
    - Accept `(transactions, mode)` where mode is `'date-desc' | 'amount-desc' | 'amount-asc' | 'category-az'`
    - Return a new sorted array; do NOT mutate the input array
    - Apply date-descending as secondary sort criterion for ties
    - _Requirements: 8.2, 8.5_



- [ ] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the Renderer module
  - [x] 7.1 Implement `Renderer.formatRupiah()` and `Renderer.formatDate()` and `Renderer.formatMonth()` in `js/script.js`
    - `formatRupiah(amount)`: integer display with period as thousands separator, prefixed with `"Rp "` (e.g., `50000 → "Rp 50.000"`, `0 → "Rp 0"`)
    - `formatDate(isoString)`: return `"DD/MM/YYYY"` from ISO 8601 string
    - `formatMonth(isoString)`: return `"MMMM YYYY"` (e.g., `"May 2025"`) from ISO 8601 string
    - _Requirements: 3.4, 4.2, 7.2_



  - [x] 7.3 Implement `Renderer.renderBalance()` in `js/script.js`
    - Sum all transaction amounts; format with `formatRupiah`; update `#Balance` text content
    - Apply red color (`#D32F2F`) to `#Balance` when total exceeds a set budget (if budget feature is present); otherwise display normally
    - Display `"Rp 0"` when transaction array is empty
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_



  - [x] 7.5 Implement `Renderer.renderTransactionList()` in `js/script.js`
    - Rebuild `#transactionList` from the provided (already-sorted) transactions array
    - Each `<li>` displays: item name, amount as Rupiah, category, date as `DD/MM/YYYY`, and a delete button with `data-id` attribute
    - Display `"No transactions yet."` when array is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_



  - [x] 7.7 Implement `Renderer.renderMonthlySummary()` in `js/script.js`
    - Group transactions by `YYYY-MM` key derived from `date` field
    - Sort groups descending (most recent first)
    - Render each group as `"MMMM YYYY — Rp X.XXX"` in `#monthlySummaryList`
    - Display `"No monthly data yet."` when array is empty
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_



  - [x] 7.9 Implement `Renderer.renderAll()` in `js/script.js`
    - Call `renderTransactionList`, `renderBalance`, `renderChart`, `renderMonthlySummary` in sequence
    - _Requirements: 2.9_

- [x] 8. Implement the ChartManager module
  - [x] 8.1 Implement `ChartManager.init()` and `ChartManager.update()` and `ChartManager.destroy()` in `js/script.js`
    - Define `PALETTE` array of 12 distinct hex colors (built-in categories get first 4 slots)
    - `init(canvasId)`: create a Chart.js doughnut instance on the canvas; store in `ChartManager.instance`
    - `update(categoryTotals)`: update `instance.data.labels`, `instance.data.datasets[0].data`, and colors; call `instance.update()`; hide canvas and show `#chartPlaceholder` when all totals are zero; show canvas and hide placeholder otherwise
    - `destroy()`: call `instance.destroy()` if instance exists; set to null
    - Aggregate category totals from the transactions array before calling `update`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_



- [ ] 9. Implement custom category UI and wire category dropdown
  - [x] 9.1 Implement `Categories.load()` call and `populateCategoryDropdown()` in `js/script.js`
    - On init, call `Categories.load()` then populate `#Category` select with all categories from `Categories.getAll()`
    - Built-in options already in HTML; append `<option>` elements for each custom category
    - _Requirements: 6.3, 9.3_

  - [x] 9.2 Implement `handleAddCategory` event handler in `js/script.js`
    - Read value from `#customCategoryInput`
    - Call `Validator.validateCustomCategory(name, Categories.getAll())`
    - On invalid: display error in `#customCategoryError`; return
    - On valid: call `Categories.add(name)`; append new `<option>` to `#Category` select; clear input and error
    - On `Storage.save` failure: display inline error in `#customCategoryError`; do NOT append option
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.7_



- [x] 10. Implement App bootstrap and event wiring
  - [x] 10.1 Implement `App.init()` and `bindEvents()` in `js/script.js`
    - Check `Storage.isAvailable()`; show `#storageBanner` with appropriate message if unavailable
    - Call `Transactions.load()`, `Categories.load()`, `populateCategoryDropdown()`
    - Call `ChartManager.init('spendingChart')`
    - Call `Renderer.renderAll(Transactions.getAll())`
    - Bind `submit` on `#AddTransaction` → `handleAddTransaction`
    - Bind delegated `click` on `#transactionList` → `handleDeleteTransaction` (check `event.target.dataset.id`)
    - Bind `change` on `#sortSelect` → `handleSortChange`
    - Bind `click` on `#addCategoryBtn` → `handleAddCategory`
    - Set `App.currentSort = 'date-desc'` as default
    - Call `document.addEventListener('DOMContentLoaded', () => App.init())`
    - _Requirements: 2.9, 8.3, 9.3, 9.4_

  - [x] 10.2 Implement `handleAddTransaction` in `js/script.js`
    - Read `#itemName`, `#priceAmount`, `#Category` values
    - Call `Validator.validateTransaction(name, amount, category)`
    - On invalid: display errors in `#itemNameError`, `#priceAmountError`, `#categoryError`; return
    - On valid: clear all error spans; create transaction object with `crypto.randomUUID()` id and ISO 8601 date
    - Call `Transactions.add(transaction)`; on `StorageQuotaError` show inline error and return
    - Reset form fields (name → `""`, amount → `""`, category → first option `"Food"`)
    - Call `Renderer.renderAll(Sorter.sort(Transactions.getAll(), App.currentSort))`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 9.6_

  - [x] 10.3 Implement `handleDeleteTransaction` in `js/script.js`
    - Extract `id` from `event.target.dataset.id`; return if not present
    - Call `Transactions.delete(id)`; on save error show inline error in transaction list and return
    - Call `Renderer.renderAll(Sorter.sort(Transactions.getAll(), App.currentSort))`
    - _Requirements: 4.6, 4.7, 4.9_

  - [x] 10.4 Implement `handleSortChange` in `js/script.js`
    - Read selected value from `#sortSelect`; update `App.currentSort`
    - Call `Renderer.renderTransactionList(Sorter.sort(Transactions.getAll(), App.currentSort))`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_



- [ ] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Apply mobile-first responsive CSS
  - [ ] 12.1 Refactor `css/style.css` with mobile-first responsive layout
    - Replace `background-color: rgb(50, 255, 50)` with an accessible background color achieving ≥ 4.5:1 contrast ratio against black body text
    - Apply `font-family: Arial, sans-serif` to `body` selector; remove all per-element `font-family` declarations
    - Set minimum font size of 16px for all text-bearing elements (headings, body, labels, inputs, buttons, placeholders)
    - Set minimum touch target size of 44×44 CSS pixels for all interactive elements (buttons, inputs, selects)
    - Use Flexbox or CSS Grid for layout; ensure no content clipping or horizontal scrollbar from 320px to 1440px
    - Style `.error-msg` spans (red color, small font, hidden by default)
    - Style `.banner` and `.hidden` utility classes
    - Style `#transactionList` items with readable spacing
    - Style `#chartSection` canvas to be responsive (max-width: 100%)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_


- [ ] 13. Set up test infrastructure
  - [ ] 13.1 Initialize Jest and fast-check test setup
    - Create `package.json` with Jest as test runner and fast-check as dev dependency
    - Create `tests/unit/` and `tests/property/` directory structure
    - Configure Jest to use jsdom environment for DOM tests
    - Create test helper file with shared `transactionArb` fast-check arbitrary
    - _Requirements: (testing infrastructure — supports all property and unit tests)_

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at tasks 6, 11, and 14 ensure incremental validation
- Property tests use fast-check with Jest; each runs a minimum of 100 iterations
- Unit tests use Jest with jsdom for DOM manipulation testing
- The `Renderer` pattern ensures all DOM updates go through dedicated functions — no direct DOM mutation outside renderers
- Event delegation on `#transactionList` avoids per-item listener memory leaks
- `Storage.save()` throws a typed `StorageQuotaError` so callers can handle quota failures distinctly from other errors

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "13.1"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["7.4", "7.5"] },
    { "id": 8, "tasks": ["7.6", "7.7"] },
    { "id": 9, "tasks": ["7.8", "7.9", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 11, "tasks": ["9.2"] },
    { "id": 12, "tasks": ["9.3", "10.1"] },
    { "id": 13, "tasks": ["10.2", "10.3", "10.4"] },
    { "id": 14, "tasks": ["10.5", "12.1"] },
    { "id": 15, "tasks": ["12.2"] }
  ]
}
```
