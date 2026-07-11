---
description: TypeScript coding standards and typing conventions.
applyTo: "**/*.{ts,tsx}"
---

# TypeScript Instructions

## Purpose

TypeScript should provide clarity, safety, maintainability, and confidence during development.

Favor explicit and predictable typing over convenience.

The goal is to make invalid states impossible and reduce runtime errors.

---

## Strict Mode

Always use TypeScript strict mode.

Avoid relaxing compiler rules unless there is a strong justification.

Type safety should be treated as a feature, not an obstacle.

---

## Any

Do not use `any`.

Avoid:

```ts
const data: any;
```

Prefer:

```ts
const data: unknown;
```

or a properly defined type.

If a value's shape is unknown, use `unknown` and perform proper validation.

---

## Type vs Interface

Prefer `type` by default.

Preferred:

```ts
type Lead = {
  id: string;
  name: string;
};
```

Use `interface` only when extensibility is required.

Example:

```ts
interface BaseEntity {
  id: string;
}
```

Default choice:

```txt
type
```

---

## Explicit Types

Prefer explicit types for public contracts.

Examples:

* Component props
* Hook return values
* Service responses
* Shared models

Avoid exposing implicit structures.

---

## Component Props

Always create a dedicated type for component props.

Preferred:

```ts
type LeadCardProps = {
  leadName: string;
};
```

Avoid inline prop typing.

---

## Hook Return Types

Prefer explicit return structures.

Preferred:

```ts
type UseLeadsResult = {
  leads: Lead[];
  isLoading: boolean;
};
```

Avoid returning ambiguous structures.

---

## Service Contracts

Service methods should define input and output types.

Preferred:

```ts
async function getLeads(): Promise<Lead[]>
```

Avoid:

```ts
async function getLeads(): Promise<any>
```

---

## Domain Models

Domain models should live inside their respective feature.

Example:

```txt
features/
└── leads/
    └── types/
        └── Lead.ts
```

Avoid placing feature-specific models in shared folders.

---

## Shared Models

Only truly shared models belong in:

```txt
shared/types/
```

Avoid creating global types prematurely.

---

## Enums

Prefer union types over enums when possible.

Preferred:

```ts
type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified';
```

Avoid:

```ts
enum LeadStatus {
  NEW,
  CONTACTED,
  QUALIFIED
}
```

Union types are simpler and integrate better with TypeScript.

---

## Utility Types

Prefer built-in TypeScript utility types.

Examples:

```ts
Partial<T>
Pick<T>
Omit<T>
Record<K, V>
Readonly<T>
```

Avoid recreating existing utilities.

---

## Nullability

Be explicit about nullable values.

Preferred:

```ts
type Lead = {
  assignedUserId: string | null;
};
```

Avoid hidden nullable behavior.

---

## Type Assertions

Avoid unnecessary type assertions.

Avoid:

```ts
const lead = response as Lead;
```

Prefer proper typing at the source.

Use assertions only when absolutely necessary.

---

## Generics

Use generics when they improve reusability and clarity.

Avoid overly complex generic abstractions.

Prioritize readability.

---

## Naming

Use descriptive names.

Preferred:

```ts
Lead
LeadStatus
LeadCardProps
UseLeadsResult
CreateLeadRequest
```

Avoid generic names.

Examples:

```ts
Data
Response
Result
Object
```

---

## Type Organization

Keep types close to the feature that owns them.

Prefer:

```txt
features/leads/types/
```

over:

```txt
src/types/
```

for feature-specific models.

---

## Architectural Principles

* Use strict typing.
* Never use any.
* Prefer type over interface.
* Prefer union types over enums.
* Keep types close to their domain.
* Make contracts explicit.
* Favor readability over type cleverness.
* Use TypeScript to prevent invalid states.
* Optimize for maintainability and developer experience.
