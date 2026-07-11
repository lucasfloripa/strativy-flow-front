---
description: Rules and conventions for components inside feature modules.
applyTo: "src/features/**/components/**/*.{ts,tsx}"
---

# Feature Components Instructions

## Purpose

Components are responsible for rendering UI and handling user interactions.

Components should remain focused on presentation and orchestration.

Business rules, complex state management, and external integrations should be extracted into hooks, services, or other dedicated layers.

---

## Component Declaration

Always use named exports.

Preferred:

```tsx
export function LeadCard() {
  return <div />;
}
```

Avoid:

```tsx
export default function LeadCard() {
  return <div />;
}
```

Avoid:

```tsx
const LeadCard = () => {
  return <div />;
};

export default LeadCard;
```

---

## React.FC

Do not use React.FC.

Preferred:

```tsx
type LeadCardProps = {
  leadName: string;
};

export function LeadCard({ leadName }: LeadCardProps) {
  return <div>{leadName}</div>;
}
```

Avoid:

```tsx
const LeadCard: React.FC<Props> = ({ leadName }) => {
  return <div>{leadName}</div>;
};
```

---

## Props

Declare props using a dedicated type.

Preferred:

```tsx
type LeadCardProps = {
  leadName: string;
};

export function LeadCard({ leadName }: LeadCardProps) {
  return <div>{leadName}</div>;
}
```

Props should be explicit and strongly typed.

Avoid overly generic prop definitions.

---

## Single Responsibility

Components should have a single responsibility.

A component should solve one UI problem.

If a component becomes difficult to understand, consider splitting it into smaller components.

---

## Business Logic

Avoid placing business rules inside components.

Avoid:

* Data transformation
* Complex conditional logic
* API communication
* Workflow orchestration

Extract these responsibilities into:

* Hooks
* Services
* Utility functions

---

## API Calls

Do not perform HTTP requests directly inside components.

Avoid:

```tsx
useEffect(() => {
  fetch('/api/leads');
}, []);
```

Prefer dedicated hooks or services.

Example:

```tsx
const { leads } = useLeads();
```

---

## State Management

Keep local UI state inside the component.

Examples:

* Modal visibility
* Input values
* Open/closed states
* Temporary selections

Move shared or domain state to dedicated state management solutions.

---

## Component Size

Favor small and readable components.

If a component becomes difficult to read without excessive scrolling, consider extracting:

* Child components
* Custom hooks
* Utility functions

Readability is more important than minimizing file count.

---

## Component Structure

Organize component code in the following order:

```tsx
type Props = {};

export function ExampleComponent(props: Props) {
  // hooks

  // state

  // derived values

  // handlers

  // effects

  return (
    <div />
  );
}
```

Maintain a consistent structure across the project.

---

## Conditional Rendering

Prefer early returns.

Preferred:

```tsx
if (isLoading) {
  return <Loading />;
}

if (error) {
  return <ErrorState />;
}
```

Avoid deeply nested JSX conditions.

---

## Reusability

Do not create abstractions before they are needed.

Create reusable components only when there is a proven reuse case.

Prefer duplication over incorrect abstraction.

---

## Feature Ownership

Feature-specific components must remain inside their feature.

Examples:

```txt
features/leads/components/LeadCard.tsx
features/leads/components/LeadForm.tsx
```

Do not move feature-specific components to shared.

---

## Shared Components

Only generic and reusable UI elements belong in:

```txt
shared/components/
```

Examples:

* Button
* Input
* Modal
* Select
* Table

Shared components should remain domain-agnostic.

---

## Architectural Principles

* Use named exports.
* Do not use React.FC.
* Keep components focused on UI.
* Extract business logic from components.
* Avoid direct API communication.
* Prefer readability over clever abstractions.
* Favor composition over complexity.
* Keep feature ownership clear.
* Build reusable components only when reuse is real.
