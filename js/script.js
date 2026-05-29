'use strict';

// ---------------------------------------------------------------------------
// StorageQuotaError — thrown by Storage.save() when quota is exceeded
// ---------------------------------------------------------------------------
class StorageQuotaError extends Error {
  constructor(message = 'localStorage quota exceeded') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

// ---------------------------------------------------------------------------
// Storage Module
// ---------------------------------------------------------------------------
const Storage = {
  /**
   * Detects whether localStorage is available (e.g. not in private mode or
   * explicitly disabled). Attempts a test-write and removes the sentinel key.
   * @returns {boolean}
   */
  isAvailable() {
    const TEST_KEY = '__storage_test__';
    try {
      localStorage.setItem(TEST_KEY, '1');
      localStorage.removeItem(TEST_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Reads and JSON-parses the value stored at `key`.
   * Returns `fallback` when the key is absent or the stored value cannot be
   * parsed. On a parse error the corrupted key is overwritten with "[]" to
   * prevent repeated failures.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  load(key, fallback = []) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Overwrite corrupted data so the next load returns cleanly
      localStorage.setItem(key, '[]');
      return fallback;
    }
  },

  /**
   * JSON-serialises `value` and writes it to localStorage under `key`.
   * Throws a `StorageQuotaError` when the write fails due to quota being
   * exceeded (DOMException name "QuotaExceededError" or the Firefox alias
   * "NS_ERROR_DOM_QUOTA_REACHED").
   * @param {string} key
   * @param {*} value
   */
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        throw new StorageQuotaError();
      }
      throw e;
    }
  }
};

// ---------------------------------------------------------------------------
// Validator Module
// ---------------------------------------------------------------------------
const Validator = {
  validateTransaction(name, amount, category) {
    // Returns { valid: boolean, errors: { name?, amount?, category? } }
    const errors = {};

    // 1. Name validation: reject if trimmed length is 0
    const trimmedName = (typeof name === 'string' ? name : String(name ?? '')).trim();
    if (trimmedName.length === 0) {
      errors.name = 'Item name is required.';
    }

    // 2. Amount validation: must be a finite number, > 0, and ≤ 999,999,999.99
    const num = typeof amount === 'number' ? amount : Number(amount);
    if (!isFinite(num) || num <= 0 || num > 999999999.99) {
      errors.amount = 'Amount must be a number greater than 0 and no greater than 999,999,999.99.';
    }

    // 3. Category validation: reject if falsy or empty after trim
    const trimmedCategory = (typeof category === 'string' ? category : String(category ?? '')).trim();
    if (!category || trimmedCategory.length === 0) {
      errors.category = 'Please select a category.';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },
  validateCustomCategory(name, existingCategories) {
    // Returns { valid: boolean, error: string | null }
    const trimmed = (typeof name === 'string' ? name : String(name ?? '')).trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Category name is required.' };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'Category name must not exceed 50 characters.' };
    }

    const lowerTrimmed = trimmed.toLowerCase();
    const existing = Array.isArray(existingCategories) ? existingCategories : [];
    const isDuplicate = existing.some(
      (cat) => (typeof cat === 'string' ? cat : String(cat)).trim().toLowerCase() === lowerTrimmed
    );

    if (isDuplicate) {
      return { valid: false, error: 'Category already exists.' };
    }

    return { valid: true, error: null };
  }
};

// ---------------------------------------------------------------------------
// Transactions Module
// ---------------------------------------------------------------------------
const Transactions = {
  items: [],

  /**
   * Populates `items` from localStorage via Storage.load.
   * Falls back to an empty array if the key is absent or data is corrupt.
   */
  load() {
    this.items = Storage.load('transactions', []);
  },

  /**
   * Appends `transaction` to `items` and persists the updated array.
   * If Storage.save throws (e.g. StorageQuotaError), the item is removed
   * from `items` before the error is re-thrown so in-memory state stays
   * consistent with what is actually stored.
   * @param {{ id: string, name: string, amount: number, category: string, date: string }} transaction
   */
  add(transaction) {
    this.items.push(transaction);
    try {
      Storage.save('transactions', this.items);
    } catch (e) {
      // Revert the optimistic push so in-memory state matches storage
      this.items.pop();
      throw e;
    }
  },

  /**
   * Removes the transaction with the given `id` from `items` and persists
   * the filtered array. If Storage.save throws, `items` is NOT updated so
   * the in-memory state remains consistent with what is actually stored.
   * @param {string} id
   */
  delete(id) {
    const filtered = this.items.filter((t) => t.id !== id);
    Storage.save('transactions', filtered); // may throw — do NOT update items yet
    this.items = filtered;                  // only assign after successful save
  },

  /**
   * Returns a shallow copy of the in-memory transaction array.
   * @returns {Array}
   */
  getAll() {
    return [...this.items];
  }
};

// ---------------------------------------------------------------------------
// Categories Module
// ---------------------------------------------------------------------------
const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun', 'Others'];

const Categories = {
  custom: [],

  /**
   * Populates `custom` from localStorage via Storage.load.
   * Falls back to an empty array if the key is absent or data is corrupt.
   */
  load() {
    this.custom = Storage.load('customCategories', []);
  },

  /**
   * Trims `name` and appends it to `custom`, then persists the updated array.
   * If Storage.save throws, the item is popped back off `custom` before the
   * error is re-thrown so in-memory state stays consistent with storage.
   * @param {string} name
   */
  add(name) {
    const trimmed = (typeof name === 'string' ? name : String(name ?? '')).trim();
    this.custom.push(trimmed);
    try {
      Storage.save('customCategories', this.custom);
    } catch (e) {
      // Revert the optimistic push so in-memory state matches storage
      this.custom.pop();
      throw e;
    }
  },

  /**
   * Returns a new array containing all built-in categories followed by all
   * custom categories.
   * @returns {string[]}
   */
  getAll() {
    return [...BUILT_IN_CATEGORIES, ...this.custom];
  }
};

// ---------------------------------------------------------------------------
// Sorter Module
// ---------------------------------------------------------------------------
const Sorter = {
  sort(transactions, mode) {
    // mode: 'date-desc' | 'amount-desc' | 'amount-asc' | 'category-az'
    // Returns new sorted array; does NOT mutate input
    // Secondary sort: date descending for ties
    const copy = [...transactions];

    const dateDesc = (a, b) => new Date(b.date) - new Date(a.date);

    switch (mode) {
      case 'date-desc':
        return copy.sort(dateDesc);

      case 'amount-desc':
        return copy.sort((a, b) => {
          const primary = b.amount - a.amount;
          return primary !== 0 ? primary : dateDesc(a, b);
        });

      case 'amount-asc':
        return copy.sort((a, b) => {
          const primary = a.amount - b.amount;
          return primary !== 0 ? primary : dateDesc(a, b);
        });

      case 'category-az':
        return copy.sort((a, b) => {
          const primary = a.category.localeCompare(b.category);
          return primary !== 0 ? primary : dateDesc(a, b);
        });

      default:
        return copy;
    }
  }
};

// ---------------------------------------------------------------------------
// Renderer Module
// ---------------------------------------------------------------------------
const Renderer = {
  renderTransactionList(transactions) {
    // rebuild #transactionList
    const list = document.getElementById('transactionList');
    if (!list) return;

    list.innerHTML = '';

    if (transactions.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = 'No transactions yet.';
      list.appendChild(emptyItem);
      return;
    }

    for (const t of transactions) {
      const li = document.createElement('li');

      // Item name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'transaction-name';
      nameSpan.textContent = t.name;

      // Amount
      const amountSpan = document.createElement('span');
      amountSpan.className = 'transaction-amount';
      amountSpan.textContent = this.formatRupiah(t.amount);

      // Category
      const categorySpan = document.createElement('span');
      categorySpan.className = 'transaction-category';
      categorySpan.textContent = t.category;

      // Date
      const dateSpan = document.createElement('span');
      dateSpan.className = 'transaction-date';
      dateSpan.textContent = this.formatDate(t.date);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-id', t.id);

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(dateSpan);
      li.appendChild(deleteBtn);

      list.appendChild(li);
    }
  },
  renderBalance(transactions) {
    // Sum all transaction amounts (returns 0 for empty array)
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Format as Indonesian Rupiah and update the #Balance element
    const balanceEl = document.getElementById('Balance');
    if (balanceEl) {
      balanceEl.textContent = this.formatRupiah(total);
      // No budget feature in this spec — always reset color (satisfies Req 3.6
      // by leaving the overdrawn-color logic as a no-op until a budget is set)
      balanceEl.style.color = '';
    }
  },
  renderChart(transactions) {
    // Aggregate totals per category from the transactions array
    const categoryTotals = transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    ChartManager.update(categoryTotals);
  },
  renderMonthlySummary(transactions) {
    // group by YYYY-MM, sort desc, update list
    const list = document.getElementById('monthlySummaryList');
    if (!list) return;

    list.innerHTML = '';

    if (transactions.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = 'No monthly data yet.';
      list.appendChild(emptyItem);
      return;
    }

    // Group transactions by YYYY-MM key, accumulating totals
    const groups = {};
    for (const t of transactions) {
      const key = t.date.slice(0, 7); // e.g. "2025-05" from "2025-05-26T10:30:00.000Z"
      groups[key] = (groups[key] || 0) + t.amount;
    }

    // Sort keys descending (most recent first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    // Render each month as a <li>
    for (const key of sortedKeys) {
      const li = document.createElement('li');
      li.textContent = `${this.formatMonth(key + '-01T00:00:00.000Z')} — ${this.formatRupiah(groups[key])}`;
      list.appendChild(li);
    }
  },
  renderAll(transactions) {
    this.renderTransactionList(transactions);
    this.renderBalance(transactions);
    this.renderChart(transactions);
    this.renderMonthlySummary(transactions);
  },
  /**
   * Formats a numeric amount as Indonesian Rupiah with period thousands separator.
   * Truncates to integer (no decimal places).
   * @param {number} amount
   * @returns {string} e.g. "Rp 50.000", "Rp 1.234.567", "Rp 0"
   */
  formatRupiah(amount) {
    // Truncate to a non-negative integer safely
    const integer = Math.floor(Math.abs(typeof amount === 'number' ? amount : Number(amount) || 0));

    // Convert to string and insert '.' every 3 digits from the right
    const str = String(integer);
    let result = '';
    const offset = str.length % 3;

    for (let i = 0; i < str.length; i++) {
      if (i !== 0 && (i - offset) % 3 === 0) {
        result += '.';
      }
      result += str[i];
    }

    return 'Rp ' + result;
  },

  /**
   * Formats an ISO 8601 date string as "DD/MM/YYYY".
   * Uses UTC accessors to avoid timezone-induced date shifts.
   * @param {string} isoString
   * @returns {string} e.g. "26/05/2025"
   */
  formatDate(isoString) {
    const d = new Date(isoString);
    const day   = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year  = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * Formats an ISO 8601 date string as "MMMM YYYY" (e.g. "May 2025").
   * Uses a fixed months array with UTC accessors for cross-browser reliability.
   * @param {string} isoString
   * @returns {string} e.g. "May 2025"
   */
  formatMonth(isoString) {
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const d = new Date(isoString);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
};

// ---------------------------------------------------------------------------
// ChartManager Module
// ---------------------------------------------------------------------------
const ChartManager = {
  instance: null,
  PALETTE: [
    '#FF6384', // Food
    '#36A2EB', // Transport
    '#FFCE56', // Fun
    '#4BC0C0', // Others
    '#9966FF', '#FF9F40', '#C9CBCF', '#7BC8A4',
    '#E7E9ED', '#EA526F', '#25CED1', '#FCEADE'
  ],
  init(canvasId) {
    // Clean up any existing instance first
    this.destroy();

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.instance = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  },
  update(categoryTotals) {
    if (!this.instance) return;

    // Filter to only categories with total > 0
    const filtered = Object.entries(categoryTotals).filter(([, total]) => total > 0);

    const labels = filtered.map(([cat]) => cat);
    const data = filtered.map(([, total]) => total);
    const colors = filtered.map((_, i) => this.PALETTE[i % this.PALETTE.length]);

    this.instance.data.labels = labels;
    this.instance.data.datasets[0].data = data;
    this.instance.data.datasets[0].backgroundColor = colors;
    this.instance.update();

    // Show/hide canvas and placeholder based on whether there is any data
    const canvas = this.instance.canvas;
    const placeholder = document.getElementById('chartPlaceholder');

    if (labels.length === 0) {
      // All totals are zero — hide chart, show placeholder
      if (canvas) canvas.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
    } else {
      // There is data — show chart, hide placeholder
      if (canvas) canvas.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    }
  },
  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
};

// ---------------------------------------------------------------------------
// App Bootstrap
// ---------------------------------------------------------------------------

/**
 * Handles the add-transaction form submit event.
 * Validates inputs, creates a Transaction object, persists it, resets the
 * form, and re-renders the full UI.
 * Satisfies Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 9.6.
 * @param {Event} event
 */
function handleAddTransaction(event) {
  // 1. Always prevent the default form submission / page reload
  event.preventDefault();

  // 2. Read current field values (safe optional-chaining + nullish fallback)
  const nameVal     = document.getElementById('itemName')?.value ?? '';
  const amountVal   = document.getElementById('priceAmount')?.value ?? '';
  const categoryVal = document.getElementById('Category')?.value ?? '';

  // 3. Validate all three fields at once
  const result = Validator.validateTransaction(nameVal, amountVal, categoryVal);

  if (!result.valid) {
    // 4. Display inline errors and bail out
    document.getElementById('itemNameError').textContent    = result.errors.name     || '';
    document.getElementById('priceAmountError').textContent = result.errors.amount   || '';
    document.getElementById('categoryError').textContent    = result.errors.category || '';
    return;
  }

  // 5. Clear all error spans on a valid submission
  document.getElementById('itemNameError').textContent    = '';
  document.getElementById('priceAmountError').textContent = '';
  document.getElementById('categoryError').textContent    = '';

  // 6. Build the Transaction object
  const transaction = {
    id:       (typeof crypto !== 'undefined' && crypto.randomUUID)
                ? crypto.randomUUID()
                : Date.now().toString(),
    name:     nameVal.trim(),
    amount:   Number(amountVal),
    category: categoryVal,
    date:     new Date().toISOString()
  };

  // 7. Persist — catch quota errors with an inline message; re-throw anything else
  try {
    Transactions.add(transaction);
  } catch (e) {
    if (e instanceof StorageQuotaError) {
      document.getElementById('priceAmountError').textContent =
        'Storage full. Transaction could not be saved.';
      return;
    }
    throw e;
  }

  // 8. Reset form fields
  const itemNameEl   = document.getElementById('itemName');
  const priceAmountEl = document.getElementById('priceAmount');
  const categoryEl   = document.getElementById('Category');

  if (itemNameEl)    itemNameEl.value    = '';
  if (priceAmountEl) priceAmountEl.value = '';
  if (categoryEl)    categoryEl.value    = 'Food';

  // 9. Re-render the full UI with the current sort applied
  Renderer.renderAll(Sorter.sort(Transactions.getAll(), App.currentSort));
}

/**
 * Delegated click handler for delete buttons in the transaction list.
 * Reads the transaction id from the clicked element's data-id attribute,
 * deletes the transaction, and re-renders the full UI.
 * Satisfies Requirements 4.6, 4.7, 4.9.
 * @param {Event} event
 */
function handleDeleteTransaction(event) {
  // 1. Extract id from the clicked element — bail out if not a delete button
  const id = event.target?.dataset?.id;
  if (!id) return;

  // 2. Attempt to delete from storage
  try {
    Transactions.delete(id);
  } catch (e) {
    // Storage save failed — show inline error in the transaction list and stop
    const list = document.getElementById('transactionList');
    if (list) {
      const errorItem = document.createElement('li');
      errorItem.textContent = 'Could not delete transaction. Please try again.';
      list.appendChild(errorItem);
    }
    return;
  }

  // 3. Re-render the full UI with the current sort applied
  Renderer.renderAll(Sorter.sort(Transactions.getAll(), App.currentSort));
}

/**
 * Handles the sort-select change event.
 * Reads the selected sort mode, updates App.currentSort, and re-renders
 * only the transaction list (balance, chart, and monthly summary are
 * unaffected by sort order).
 * Satisfies Requirements 8.1, 8.2, 8.3, 8.4.
 * @param {Event} event
 */
function handleSortChange(event) {
  const newSort = event.target?.value;
  if (!newSort) return;

  App.currentSort = newSort;
  Renderer.renderTransactionList(Sorter.sort(Transactions.getAll(), App.currentSort));
}

/**
 * Binds all UI event listeners.
 * Called once from App.init() after the DOM is ready.
 * Satisfies Requirements 2.9, 8.3, 9.3, 9.4.
 */
function bindEvents() {
  document.getElementById('AddTransaction')?.addEventListener('submit', handleAddTransaction);
  document.getElementById('transactionList')?.addEventListener('click', handleDeleteTransaction);
  document.getElementById('sortSelect')?.addEventListener('change', handleSortChange);
  document.getElementById('addCategoryBtn')?.addEventListener('click', handleAddCategory);
}

/**
 * Populates the #Category select element with all categories from Categories.getAll().
 * Clears all existing options first, then re-adds every category (built-in + custom)
 * from scratch so the dropdown always reflects the current state.
 * Satisfies Requirements 6.3 and 9.3.
 */
function populateCategoryDropdown() {
  const select = document.getElementById('Category');
  if (!select) return;

  // Clear all existing options
  select.innerHTML = '';

  // Re-add all categories (built-in + custom) as <option> elements
  const categories = Categories.getAll();
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  }
}

/**
 * Handles the "Add Category" button click.
 * Reads the custom category name from #customCategoryInput, validates it,
 * and on success appends a new <option> to the #Category select and persists
 * the category via Categories.add(). Displays inline errors on failure.
 * Satisfies Requirements 6.1, 6.2, 6.4, 6.5, 6.7.
 */
function handleAddCategory() {
  const input = document.getElementById('customCategoryInput');
  const name = input ? input.value : '';
  const errorEl = document.getElementById('customCategoryError');

  // Validate the category name against all existing categories
  const result = Validator.validateCustomCategory(name, Categories.getAll());

  if (result.valid === false) {
    // Show validation error and stop
    if (errorEl) errorEl.textContent = result.error;
    return;
  }

  // Clear any previous error
  if (errorEl) errorEl.textContent = '';

  const trimmedName = name.trim();

  try {
    // Persist the new category (may throw StorageQuotaError or other errors)
    Categories.add(trimmedName);

    // Only append the option after a successful save
    const select = document.getElementById('Category');
    if (select) {
      const option = document.createElement('option');
      option.value = trimmedName;
      option.textContent = trimmedName;
      select.appendChild(option);
    }

    // Clear the input field
    if (input) input.value = '';
  } catch (e) {
    // Storage save failed — Categories.add already reverted in-memory state
    if (errorEl) errorEl.textContent = 'Category could not be saved. Storage may be full.';
  }
}

const App = {
  currentSort: 'date-desc',

  /**
   * Bootstraps the application:
   *  1. Checks localStorage availability and shows a banner if unavailable.
   *  2. Loads persisted transactions and custom categories.
   *  3. Populates the category dropdown (built-in + custom).
   *  4. Initialises the Chart.js doughnut chart.
   *  5. Renders the full UI from the loaded data.
   *  6. Binds all UI event listeners.
   * Satisfies Requirements 2.9, 8.3, 9.3, 9.4.
   */
  init() {
    // 1. Storage availability check — show banner if unavailable (Req 9.4)
    if (!Storage.isAvailable()) {
      const banner = document.getElementById('storageBanner');
      if (banner) {
        banner.textContent = 'Storage unavailable. Your data will not be saved.';
        banner.classList.remove('hidden');
      }
    }

    // 2. Load persisted data into memory
    Transactions.load();
    Categories.load();

    // 3. Populate the category <select> with built-in + custom categories (Req 9.3)
    populateCategoryDropdown();

    // 4. Initialise the Chart.js doughnut chart
    ChartManager.init('spendingChart');

    // 5. Render the full UI from the loaded transaction data
    Renderer.renderAll(Transactions.getAll());

    // 6. Bind all UI event listeners
    bindEvents();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
