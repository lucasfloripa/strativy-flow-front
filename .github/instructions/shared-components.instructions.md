---
description: Rules and conventions for reusable shared UI components.
applyTo: "src/shared/components/**/*.{ts,tsx}"
---

# Shared Components Instructions

## Purpose

Shared components provide reusable UI building blocks for the application.

Shared components must remain domain-agnostic and reusable across multiple features.

They should focus on presentation and interaction patterns rather than business concepts.

---

## Domain Independence

Shared components must not depend on business domains.

Avoid references to:

* Leads
* Users
* Boards
* Messages
* Orders
* Products

Examples of invalid shared components:

```txt
LeadCard
UserDetails
BoardColumn
MessageBubble
```

These components belong to their respective features.

---

## Valid Shared Components

Examples:

```txt
Button
Input
Modal
Select
Table
Drawer
Tooltip
Badge
```

Shared components should solve generic UI problems.

---

## Reusability

A component should only be moved to shared when there is proven reuse.

Avoid extracting components prematurely.

Prefer:

```txt
Feature duplication
↓
Reuse identified
↓
Move to shared
```

Avoid creating abstractions before they are necessary.

---

## Single Responsibility

Each shared component should have a clear responsibility.

Preferred:

```txt
Button
Input
Modal
```

Avoid large components that solve multiple unrelated problems.

---

## Business Logic

Shared components must not contain business rules.

Avoid:

* API calls
* Domain workflows
* Business validations
* Feature-specific behavior

Business logic belongs to:

* Features
* Hooks
* Services

---

## State Management

Shared components may own local UI state.

Examples:

* Open/close state
* Hover state
* Focus state

Avoid storing business state.

---

## Props Design

Props should be explicit and predictable.

Preferred:

```ts
type ButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
};
```

Avoid generic prop structures.

Example:

```ts
data: any
config: object
```

---

## Composition

Favor composition over excessive configuration.

Preferred:

```tsx
<Modal>
  <LeadForm />
</Modal>
```

Avoid creating highly configurable components that attempt to solve every possible use case.

---

## Styling

Shared components should define reusable design patterns.

Avoid feature-specific styling decisions.

The same component should work across multiple domains.

---

## Accessibility

Shared components should prioritize accessibility.

Examples:

* Keyboard navigation
* Semantic HTML
* Focus management
* Proper labels

Accessibility should be built into the component.

---

## Dependencies

Keep dependencies minimal.

Shared components should not depend on feature modules.

Preferred:

```txt
Shared
↓
Nothing
```

Avoid:

```txt
Shared
↓
Feature
```

Feature dependencies inside shared components are not allowed.

---

## Folder Structure

Shared components belong in:

```txt
shared/components/
```

Example:

```txt
shared/components/
├── Button
├── Input
├── Modal
├── Table
└── Select
```

---

## Architectural Principles

* Shared components are domain-agnostic.
* Shared components solve generic UI problems.
* Shared components do not contain business logic.
* Shared components do not call APIs.
* Shared components do not depend on features.
* Favor composition over configuration.
* Build reusable components only when reuse is real.
* Prioritize accessibility and maintainability.
* Keep shared components simple and predictable.
