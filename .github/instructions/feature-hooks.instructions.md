---
description: Rules and conventions for custom hooks inside feature modules.
applyTo: "src/features/**/hooks/**/*.{ts,tsx}"
---

# Feature Hooks Instructions

## Purpose

Custom hooks encapsulate reusable behavior, state management, side effects, and business workflows.

Hooks should separate logic from UI and keep components focused on rendering and user interaction.

---

## Naming

All custom hooks must start with the `use` prefix.

Preferred:

```ts
useLeads()
useLeadDetails()
useCreateLead()
```

Avoid:

```ts
leadHook()
leadManager()
leadHelper()
```

---

## Single Responsibility

Each hook should have a single responsibility.

Preferred:

```ts
useLeads()
useCreateLead()
useUpdateLead()
```

Avoid:

```ts
useLeadManagement()
```

when it handles:

* listing
* creation
* update
* deletion
* filters
* pagination

all together.

---

## Business Logic

Business rules should live inside hooks rather than components.

Preferred:

```tsx
const {
  leads,
  isLoading,
  createLead,
} = useLeads();
```

Components should consume behavior.

Hooks should provide behavior.

---

## Side Effects

Side effects should be isolated inside hooks.

Examples:

* API calls
* Event subscriptions
* Timers
* Browser integrations
* Local storage access

Avoid implementing these concerns directly inside components.

---

## API Communication

Hooks may orchestrate API communication.

Preferred:

```ts
export function useLeads() {
  const [leads, setLeads] = useState([]);

  // consume services
}
```

Hooks should use services rather than implementing HTTP logic directly.

Avoid:

```ts
fetch(...)
axios(...)
```

spread across multiple components.

---

## Service Integration

Hooks should orchestrate services.

Example:

```ts
useLeads()
    ↓
LeadService
    ↓
API Client
```

Keep responsibilities separated.

---

## Return Values

Prefer returning objects instead of arrays.

Preferred:

```ts
return {
  leads,
  isLoading,
  createLead,
};
```

Avoid:

```ts
return [
  leads,
  isLoading,
  createLead,
];
```

Object returns are easier to understand and extend.

---

## State Ownership

Hooks may own:

* Domain state
* Feature state
* Async state
* Form state

Components should own only local UI state when possible.

---

## Composition

Prefer composing hooks rather than creating large hooks.

Preferred:

```ts
useLeads()
useLeadFilters()
useLeadSelection()
```

Instead of:

```ts
useLeadManagement()
```

that handles everything.

---

## Reusability

Extract hooks only when:

* logic is reused
* logic is complex
* logic improves readability

Do not create hooks for trivial abstractions.

Avoid:

```ts
useIsOpen()
```

when a simple `useState(false)` is sufficient.

---

## Hook Size

Favor small and focused hooks.

If a hook becomes difficult to understand, consider splitting responsibilities.

---

## Error Handling

Hooks should expose errors in a predictable way.

Preferred:

```ts
return {
  data,
  isLoading,
  error,
};
```

Avoid hiding failures.

Consumers should be able to react to errors.

---

## Dependencies

Keep hook dependencies explicit.

Avoid hidden coupling between unrelated hooks.

Hooks should be easy to test and reason about.

---

## Architectural Principles

* Hooks encapsulate behavior.
* Components render UI.
* Services communicate externally.
* Hooks orchestrate services.
* Keep hooks focused.
* Prefer composition over large hooks.
* Return objects instead of arrays.
* Avoid premature abstractions.
* Keep responsibilities explicit.
