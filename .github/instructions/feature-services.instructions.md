---
description: Rules and conventions for services inside feature modules.
applyTo: "src/features/**/services/**/*.{ts,tsx}"
---

# Feature Services Instructions

## Purpose

Services encapsulate business operations and external communication.

Services provide a clear boundary between application logic and external systems.

Examples:

* HTTP APIs
* Browser storage
* Third-party integrations
* Authentication providers
* External SDKs

Services should be framework-agnostic whenever possible.

---

## Responsibilities

Services are responsible for:

* Fetching data
* Sending data
* Executing business operations
* Communicating with external systems
* Data transformation between API and application models

Services are not responsible for:

* Rendering UI
* Managing React state
* Managing component lifecycle
* Handling presentation concerns

---

## Naming

Use descriptive names.

Preferred:

```ts id="yx2t1u"
LeadService
UserService
AuthService
BoardService
```

Avoid generic names.

Avoid:

```ts id="cvx2ao"
ApiHelper
UtilsService
DataManager
```

---

## React Independence

Services must not depend on React.

Avoid:

```ts id="w6y2yq"
useState()
useEffect()
useMemo()
```

inside services.

Services should be usable outside React components.

---

## API Communication

HTTP communication should be centralized in services.

Preferred:

```ts id="zhgdd4"
LeadService.getLeads()
LeadService.createLead()
LeadService.updateLead()
```

Avoid API calls scattered throughout components and hooks.

---

## Service Structure

Prefer grouping operations by business domain.

Example:

```ts id="8rd0m8"
LeadService
├── getLeads
├── getLeadById
├── createLead
├── updateLead
└── archiveLead
```

Keep related operations together.

---

## Error Handling

Services should throw meaningful errors.

Avoid silently swallowing failures.

Preferred:

```ts id="ec7eqx"
throw new Error('Failed to load leads');
```

Consumers should decide how errors are displayed.

---

## Data Transformation

Services may transform API responses into application-friendly models.

Example:

```ts id="g8q8ua"
API Response
↓
Service Mapping
↓
Application Model
```

Avoid spreading API-specific structures throughout the application.

---

## Single Responsibility

Each service should focus on a single domain.

Preferred:

```ts id="kh8o3w"
LeadService
UserService
AuthService
```

Avoid:

```ts id="1q6x0d"
ApplicationService
```

that manages unrelated concerns.

---

## Reusability

Services should be reusable across:

* Components
* Hooks
* Features

Services should expose predictable APIs.

---

## State Management

Services should not store application state.

Avoid:

```ts id="h8lhw9"
let currentUser;
let selectedLead;
```

inside services.

State belongs to:

* Components
* Hooks
* State management solutions

---

## Dependency Management

Services should depend on infrastructure.

Example:

```ts id="ww1crw"
LeadService
↓
ApiClient
```

Avoid coupling services directly to UI layers.

---

## Architectural Principles

* Services communicate externally.
* Services encapsulate business operations.
* Services are independent from React.
* Services do not manage UI.
* Services do not own application state.
* Services expose predictable APIs.
* Keep services domain-focused.
* Centralize external communication.
* Avoid leaking API contracts across the application.
