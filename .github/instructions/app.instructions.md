---
description: Rules and conventions for the application bootstrap, routing, layouts and providers.
applyTo: "src/app/**/*.{ts,tsx}"
---

# App Instructions

## Purpose

The app layer is responsible for bootstrapping and composing the application.

It acts as the entry point of the system and coordinates global concerns.

The app layer must not contain business logic.

---

## Responsibilities

The app layer is responsible for:

* Application bootstrap
* Routing
* Global layouts
* Global providers
* Navigation
* Authentication guards
* Application composition

The app layer should orchestrate the application, not implement business behavior.

---

## Suggested Structure

```txt
app/
├── routes/
├── providers/
├── layouts/
├── guards/
├── navigation/
└── bootstrap/
```

The structure may evolve according to project needs while preserving responsibilities.

---

## Routing

Route definitions belong to the app layer.

Examples:

```txt
app/routes/
```

Responsibilities:

* Route registration
* Route grouping
* Route protection
* Route composition

Avoid implementing business logic inside route definitions.

---

## Layouts

Layouts define application structure.

Examples:

* Auth layout
* Dashboard layout
* Public layout

Layouts should focus on composition and visual structure.

Avoid embedding feature-specific business logic.

---

## Providers

Global providers belong to the app layer.

Examples:

* Query providers
* Theme providers
* Authentication providers
* State providers
* Internationalization providers

Providers should expose infrastructure capabilities.

Avoid business-specific providers.

---

## Guards

Guards control access to application sections.

Examples:

* Authentication guards
* Authorization guards

Guards should verify access conditions.

Avoid embedding domain workflows.

---

## Navigation

Navigation configuration belongs to the app layer.

Examples:

* Menu definitions
* Sidebar configuration
* Navigation groups

Navigation should consume feature capabilities rather than implement them.

---

## Bootstrap

Bootstrap is responsible for initializing the application.

Examples:

* Application startup
* Global initialization
* Environment configuration
* Infrastructure initialization

Bootstrap code should remain minimal and predictable.

---

## Feature Integration

The app layer consumes features.

Preferred:

```txt
App
↓
Features
```

Avoid:

```txt
Feature
↓
App
```

Features should not depend on the app layer.

---

## Business Logic

Do not place business logic inside:

* Routes
* Layouts
* Providers
* Guards
* Navigation

Business logic belongs to:

* Features
* Hooks
* Services

The app layer should remain focused on composition.

---

## State Management

Avoid storing business state in the app layer.

The app layer may manage:

* Global providers
* Global contexts
* Application initialization

Feature state should remain inside features.

---

## Architectural Principles

* The app layer is the application's entry point.
* The app layer composes the application.
* The app layer does not own business logic.
* Features are consumed by the app layer.
* Global concerns belong to the app layer.
* Business concerns belong to features.
* Keep routing simple and predictable.
* Keep providers focused on infrastructure.
* Favor composition over implementation.
