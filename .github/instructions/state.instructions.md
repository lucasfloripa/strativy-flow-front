---
description: Rules and conventions for application state management.
applyTo: "**/*.{ts,tsx}"
---

# State Management Instructions

## Purpose

State should live as close as possible to where it is used.

Avoid promoting state to global scope unless there is a clear need for sharing it across multiple parts of the application.

Favor simplicity and predictability.

---

## State Categories

Treat state according to its responsibility.

### Local UI State

State that affects only a single component.

Examples:

* Modal visibility
* Form input values
* Dropdown state
* Tabs
* Loading indicators specific to a component

Keep local UI state inside the component.

Preferred:

```tsx
const [isOpen, setIsOpen] = useState(false);
```

Do not move local state to global stores unnecessarily.

---

### Feature State

State shared within a feature.

Examples:

* Selected lead
* Current board filter
* Pagination state
* Search state

Prefer feature-level hooks or feature-specific state management.

Keep ownership inside the feature whenever possible.

---

### Global Application State

Only use global state for data that is truly application-wide.

Examples:

* Authenticated user
* Authentication status
* Theme
* Organization context
* Application settings

Avoid turning global state into a dumping ground.

---

### Server State

Server state is not application state.

Examples:

* Leads
* Users
* Boards
* Messages

Server state should be managed through dedicated data-fetching solutions.

Avoid copying server state into global state unnecessarily.

---

## State Ownership

State should have a single source of truth.

Avoid duplicating the same state across:

* Components
* Hooks
* Stores

Maintain clear ownership.

---

## State Scope

Always choose the smallest scope possible.

Preferred order:

```txt
Component
↓
Feature
↓
Application
```

Promote state only when necessary.

---

## Derived State

Prefer deriving values rather than storing them.

Preferred:

```ts
const filteredLeads = leads.filter(...);
```

Avoid:

```ts
const [filteredLeads, setFilteredLeads] = useState([]);
```

when the value can be derived from existing state.

---

## Global State Design

Keep global state small and focused.

Prefer multiple small stores over one large application store.

Avoid monolithic state structures.

---

## State Mutations

State updates should be predictable.

Avoid hidden mutations.

Prefer immutable update patterns.

---

## Business Logic

Avoid embedding business workflows directly inside global state.

Business logic belongs in:

* Hooks
* Services
* Domain-specific abstractions

State management should focus on storing and exposing state.

---

## Data Fetching

Do not use global state as a cache for API data unless there is a clear requirement.

Avoid:

```txt
API
↓
Global Store
↓
Components
```

for every request.

Prefer dedicated server-state solutions.

---

## Persistence

Persist only what is necessary.

Examples:

* Authentication tokens
* User preferences
* Theme selection

Avoid persisting temporary UI state.

---

## Naming

Use clear and descriptive names.

Preferred:

```ts
currentUser
selectedLead
activeBoardId
searchTerm
```

Avoid:

```ts
data
state
value
item
```

---

## Architectural Principles

* State lives as close as possible to its usage.
* Prefer local state over global state.
* Promote state only when necessary.
* Server state is different from application state.
* Keep a single source of truth.
* Derive values whenever possible.
* Avoid duplicated state.
* Keep global stores small and focused.
* Prioritize simplicity and predictability.
