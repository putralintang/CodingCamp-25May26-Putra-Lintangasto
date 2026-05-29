# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-first, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It allows users to record daily spending transactions, track their remaining balance, visualize spending by category using Chart.js, and manage custom categories — all without a backend, using the browser's Local Storage API for persistence.

The app builds on an existing `home.html` skeleton (which contains a transaction form with id `AddTransaction` and a balance display with id `Balance`), a basic `css/style.css`, and a `js/script.js` that currently has structural bugs (misplaced `<script>` tags inside a `.js` file and incorrect `getElementbyId` casing). These bugs must be resolved as part of the implementation.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single spending record consisting of an item name, amount (in Rupiah), category, and timestamp.
- **Balance**: The remaining budget, calculated as the initial balance minus the sum of all recorded transaction amounts.
- **Category**: A label grouping transactions (e.g., Food, Transport, Fun). Can be a built-in or user-defined custom category.
- **Custom_Category**: A user-defined category name added at runtime and persisted in Local Storage.
- **Transaction_List**: The rendered list of all recorded transactions displayed in the UI.
- **Chart**: A visual doughnut chart rendered via Chart.js showing spending totals per category.
- **Local_Storage**: The browser's `localStorage` API used as the sole persistence layer.
- **Monthly_Summary**: An aggregated view of total spending grouped by calendar month.
- **Validator**: The client-side input validation logic within `script.js`.
- **Renderer**: The DOM manipulation logic responsible for updating the UI after data changes.

---

## Requirements

### Requirement 1: Fix Existing Code Bugs

**User Story:** As a developer, I want the existing code bugs resolved, so that the app runs correctly in all target browsers without JavaScript errors.

#### Acceptance Criteria

1. THE App SHALL load `js/script.js` using a `<script src="js/script.js" defer>` tag in `home.html`, replacing the current `<link rel="script">` tag, so that the script executes after the DOM is fully parsed.
2. THE App SHALL contain no `<script>` or `</script>` tags inside `js/script.js`.
3. WHEN the DOM is queried by element ID, THE App SHALL use `document.getElementById` (replacing all occurrences of the incorrect `document.getElementbyId`) in all JavaScript code.
4. THE App SHALL resolve the duplicate category input by removing the radio button group, the dangling `<label>Category</label>` that belongs to the radio group, and retaining only the `<select>` element with id `Category` as the single category input in the Add Transaction form.
5. THE App SHALL remove the unlabelled, unnamed `<input type="text">` field that currently appears below the radio buttons in the form.

---

### Requirement 2: Add Transaction

**User Story:** As a user, I want to add a spending transaction with a name, amount, and category, so that I can keep a record of my daily expenses.

#### Acceptance Criteria

1. THE App SHALL present a form with id `AddTransaction` containing: a text field for item name (accepting up to 100 characters), a numeric field for amount in Rupiah, and a `<select>` dropdown for category with exactly the built-in options: Food, Transport, Fun, Others.
2. WHEN the user submits the `AddTransaction` form, THE Validator SHALL verify that the item name field is not empty.
3. WHEN the user submits the `AddTransaction` form, THE Validator SHALL verify that the amount field contains a positive number greater than zero and no greater than 999,999,999.99.
4. IF the item name field is empty on form submission, THEN THE Validator SHALL display an inline error message adjacent to the item name field and prevent form submission.
5. IF the amount field contains a non-numeric value, a value less than or equal to zero, or a value greater than 999,999,999.99 on form submission, THEN THE Validator SHALL display an inline error message adjacent to the amount field and prevent form submission.
6. IF no category is selected on form submission, THEN THE Validator SHALL display an inline error message adjacent to the category field and prevent form submission.
7. WHEN a valid form is submitted, THE App SHALL create a Transaction object containing: item name, amount (as a number), category, and an ISO 8601 timestamp of the submission time.
8. WHEN a valid form is submitted, THE App SHALL save the new Transaction to Local_Storage under the key `"transactions"`.
9. WHEN a valid form is submitted, THE Renderer SHALL update the Transaction_List, Balance display, and Chart without a full page reload.
10. WHEN a valid form is submitted, THE App SHALL reset all form fields: item name to empty, amount to empty, and category dropdown to the first option (Food).

---

### Requirement 3: Display Balance

**User Story:** As a user, I want to see my remaining balance at all times, so that I know how much I have left to spend.

#### Acceptance Criteria

1. WHEN the page loads, THE Renderer SHALL calculate the Balance by summing all Transaction amounts from Local_Storage and display the result in the element with id `Balance`.
2. WHEN a new Transaction is added, THE Renderer SHALL recalculate the Balance by summing all Transaction amounts and update the `Balance` element immediately.
3. WHEN a Transaction is deleted, THE Renderer SHALL recalculate the Balance by summing all remaining Transaction amounts and update the `Balance` element immediately.
4. THE App SHALL display the Balance formatted as Indonesian Rupiah (e.g., `Rp 50.000`), using period (`.`) as the thousands separator and the prefix `Rp `.
5. WHILE the total of all Transaction amounts is zero (no transactions recorded), THE Renderer SHALL display `Rp 0` in the `Balance` element.
6. WHEN the sum of all Transaction amounts exceeds the initial budget (if a budget is set), THE Renderer SHALL display the Balance value in red (`#D32F2F` or equivalent) to indicate an overdrawn state.

---

### Requirement 4: Display Transaction History

**User Story:** As a user, I want to see a list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. WHEN the page loads, THE Renderer SHALL read all Transactions from Local_Storage under the key `"transactions"` and display them as a list.
2. WHEN the Transaction_List is rendered, THE Renderer SHALL display for each Transaction: item name, amount formatted as Rupiah, category, and date formatted as `DD/MM/YYYY`.
3. WHEN the Transaction_List contains no entries, THE Renderer SHALL display the message "No transactions yet."
4. WHEN a new Transaction is added, THE Renderer SHALL prepend it to the top of the Transaction_List.
5. WHEN the Transaction_List is rendered, THE Renderer SHALL display a delete button for each Transaction entry.
6. WHEN a delete button is activated, THE App SHALL remove the corresponding Transaction from Local_Storage under the key `"transactions"`.
7. WHEN a delete button is activated, THE App SHALL re-render the Transaction_List and the Balance to reflect the updated data.
8. IF reading from Local_Storage fails on page load, THEN THE Renderer SHALL display the message "Transactions could not be loaded." and initialize with an empty Transaction list.
9. IF removing a Transaction from Local_Storage fails, THEN THE App SHALL retain the Transaction in the Transaction_List and display an inline error message indicating that the deletion could not be completed.

---

### Requirement 5: Category Chart Visualization

**User Story:** As a user, I want to see a chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a doughnut Chart on the page using Chart.js, showing the total spending amount per category as proportional segments.
2. WHEN the Transaction_List changes (add or delete), THE Renderer SHALL update the Chart data and re-render the Chart to reflect the new category totals.
3. WHEN the Transaction_List is empty, THE Renderer SHALL hide the Chart canvas and display the message "Add transactions to see your spending chart." in its place.
4. WHEN the Transaction_List is non-empty, THE Renderer SHALL show the Chart canvas and hide the placeholder message.
5. THE Chart SHALL display a legend that maps each color segment to its category label. Categories with a total spending of zero SHALL NOT appear as segments or in the legend.

---

### Requirement 6: Custom Categories

**User Story:** As a user, I want to add my own spending categories, so that I can organize transactions in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide an input field (accepting up to 50 characters) and a button that allow the user to add a Custom_Category by name.
2. WHEN a Custom_Category is successfully added, THE App SHALL save it to Local_Storage under the key `"customCategories"` and append it as a new `<option>` in the Category `<select>` dropdown immediately.
3. WHEN the page is loaded, THE App SHALL retrieve all Custom_Category entries from Local_Storage under the key `"customCategories"` and populate the Category `<select>` dropdown alongside the built-in categories.
4. IF the user attempts to add a Custom_Category with an empty name or a name exceeding 50 characters, THEN THE Validator SHALL display an inline error message indicating the violation and prevent the addition.
5. IF the user attempts to add a Custom_Category whose name (case-insensitive) already exists among built-in or existing Custom_Category entries, THEN THE Validator SHALL display an inline error message and prevent the duplicate addition.
6. WHEN the Chart is rendered, THE App SHALL display each Custom_Category as a color segment that is visually distinguishable from all other segments, such that no two segments in the same Chart share the same color.
7. IF Local_Storage is unavailable or the save operation fails, THEN THE App SHALL display an inline error message indicating that the Custom_Category could not be saved and SHALL NOT append it to the Category `<select>` dropdown.

---

### Requirement 7: Monthly Spending Summary

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can track my financial habits over time.

#### Acceptance Criteria

1. THE App SHALL display a Monthly_Summary section that lists each calendar month for which at least one Transaction exists.
2. WHEN the Monthly_Summary is rendered, THE Renderer SHALL display for each month: the month label formatted as `MMMM YYYY` (e.g., `May 2025`) and the total amount spent in that month formatted as Rupiah (e.g., `Rp 150.000`).
3. WHEN the Monthly_Summary is rendered, THE Renderer SHALL list months in descending order (most recent month first).
4. WHEN a Transaction is added or deleted, THE Renderer SHALL update the Monthly_Summary without requiring a page reload.
5. WHEN no Transactions exist, THE Renderer SHALL display the message "No monthly data yet." in the Monthly_Summary section.
6. EACH Transaction object SHALL include a date field (ISO 8601 timestamp) that the Monthly_Summary uses to determine the calendar month of that Transaction.

---

### Requirement 8: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can find and analyze my spending more easily.

#### Acceptance Criteria

1. THE App SHALL provide a sort control (a `<select>` dropdown) with exactly the following options: "Date (Newest First)", "Amount (High to Low)", "Amount (Low to High)", and "Category (A–Z)".
2. WHEN the user selects a sort option, THE Renderer SHALL re-render the Transaction_List in the selected order within 100ms, without modifying the underlying data in Local_Storage.
3. WHEN the page is loaded, THE App SHALL default to the "Date (Newest First)" sort order, regardless of any previously selected sort option.
4. WHEN a new Transaction is added, THE Renderer SHALL apply the currently active sort order to the updated Transaction_List.
5. WHEN two or more Transactions have equal values for the active sort key, THE Renderer SHALL use date (newest first) as the secondary sort criterion.

---

### Requirement 9: Data Persistence

**User Story:** As a user, I want my transactions and custom categories to be saved between sessions, so that I don't lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE App SHALL write the updated Transaction array as a JSON-serialized string to Local_Storage under the key `"transactions"`.
2. WHEN a Custom_Category is added, THE App SHALL write the updated Custom_Category array as a JSON-serialized string to Local_Storage under the key `"customCategories"`.
3. WHEN the page is loaded, THE App SHALL read and deserialize the values at keys `"transactions"` and `"customCategories"` from Local_Storage and use them to populate the Transaction_List, Balance display, and Category `<select>` dropdown.
4. IF Local_Storage is unavailable on page load, THEN THE App SHALL initialize with an empty Transaction array and empty Custom_Category array, and display a non-blocking banner message "Storage unavailable. Your data will not be saved." that does not prevent the user from interacting with the app.
5. IF a JSON parse error occurs when reading from Local_Storage on page load, THEN THE App SHALL initialize with an empty Transaction array and empty Custom_Category array, and display a non-blocking banner message "Saved data could not be read and has been reset." that does not prevent the user from interacting with the app.
6. IF a Local_Storage write operation fails due to storage quota being exceeded, THEN THE App SHALL display an inline error message "Storage full. Transaction could not be saved." and SHALL NOT add the Transaction to the in-memory Transaction array or the Transaction_List.

---

### Requirement 10: Cross-Browser Compatibility

**User Story:** As a developer, I want the app to work correctly on all major browsers, so that users are not excluded based on their browser choice.

#### Acceptance Criteria

1. THE App SHALL render all UI sections (form, Transaction_List, Balance, Chart, Monthly_Summary) without layout breakage on the latest stable versions of Chrome, Edge, Safari, and Firefox.
2. THE App SHALL use only the following Web APIs (no polyfills required): `localStorage`, `JSON.stringify`, `JSON.parse`, `Date`, `Array.prototype.forEach`, `Array.prototype.filter`, `Array.prototype.map`, `Array.prototype.sort`, `Array.prototype.reduce`, and `EventTarget.addEventListener`.
3. THE App SHALL not use any JavaScript framework or library other than Chart.js.
4. THE App SHALL use only CSS properties supported natively in the latest stable versions of Chrome, Edge, Safari, and Firefox without vendor prefixes (e.g., Flexbox, CSS Grid, CSS custom properties).

---

### Requirement 11: Mobile-First Responsive UI

**User Story:** As a user, I want the app to be easy to use on my phone, so that I can record expenses on the go.

#### Acceptance Criteria

1. THE App SHALL include a `<meta name="viewport" content="width=device-width, initial-scale=1.0">` tag in `home.html` (already present).
2. THE App SHALL use a responsive layout so that at viewport widths from 320px to 1440px, no content is clipped and no horizontal scrollbar appears.
3. THE App SHALL set a minimum font size of 16px for all text-bearing elements, including headings, body text, form labels, button text, input text, and placeholder text.
4. THE App SHALL ensure all interactive elements — buttons, text inputs, select dropdowns — have a minimum touch target size of 44×44 CSS pixels.
5. THE App SHALL maintain a color contrast ratio of at least 4.5:1 between text color and background color for all text-bearing elements, in compliance with WCAG 2.1 AA.
6. THE App SHALL replace the current bright green background (`rgb(50, 255, 50)`) with a background color that achieves a contrast ratio of at least 4.5:1 against the CSS `color` property on `body` text (defaulting to `rgb(0,0,0)` if unset).
7. THE App SHALL apply the font stack `Arial, sans-serif` consistently to all text-bearing elements via a single CSS rule on the `body` selector, replacing the current per-element font declarations.
