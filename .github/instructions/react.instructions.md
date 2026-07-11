---
description: Root React TypeScript architecture guidelines.
applyTo: "**/*.{ts,tsx}"
---

# React Instructions

## Purpose

These instructions define the architectural and development standards for React TypeScript applications.

All code generated within this project must follow the conventions described by the instruction set.

The primary goals are:

* Maintainability
* Scalability
* Readability
* Consistency
* Predictability

When making architectural decisions, prioritize long-term maintainability over short-term convenience.

---

## Architecture Philosophy

The application follows a feature-first architecture.

Business domains are the primary organizational unit.

Prefer:

```txt id="qsmh1m"
features/
├── leads/
├── users/
├── auth/
└── dashboard/
```

Avoid organizing the application exclusively by technical layers.

---

## Layer Responsibilities

The application is divided into four primary layers:

```txt id="ggn2sv"
src/
├── app/
├── core/
├── shared/
└── features/
```

Responsibilities:

### app

Application composition.

Examples:

* Routes
* Layouts
* Providers
* Guards
* Navigation

---

### core

Infrastructure.

Examples:

* API client
* Authentication infrastructure
* Configuration
* Storage
* Theme

---

### shared

Reusable and domain-agnostic code.

Examples:

* UI components
* Shared hooks
* Utilities
* Constants

---

### features

Business capabilities and domains.

Examples:

* Leads
* Users
* Boards
* Messages

---

## Component Philosophy

Components are responsible for rendering UI.

Components should remain focused on presentation and interaction.

Business logic should be extracted to hooks and services.

---

## Hook Philosophy

Hooks encapsulate behavior.

Hooks manage:

* State orchestration
* Side effects
* Business workflows
* Service integration

Hooks should separate logic from UI.

---

## Service Philosophy

Services encapsulate:

* External communication
* Business operations
* API interactions

Services should remain independent from React.

---

## State Philosophy

State should live as close as possible to where it is used.

Preferred order:

```txt id="zwm1vw"
Component
↓
Feature
↓
Application
```

Promote state only when necessary.

---

## API Philosophy

Always follow:

```txt id="n9slmh"
Component
↓
Hook
↓
Service
↓
API Client
↓
Backend
```

Components must never communicate directly with APIs.

---

## TypeScript Philosophy

Type safety is mandatory.

Rules:

* Strict mode enabled
* No any
* Prefer type over interface
* Prefer union types over enums
* Explicit contracts

---

## Shared Code Philosophy

Move code to shared only after reuse becomes evident.

Avoid premature abstractions.

Prefer duplication over incorrect abstraction.

---

## Architectural Principles

* Organize by business domain.
* Favor feature ownership.
* Keep responsibilities explicit.
* Prefer composition over complexity.
* Prefer readability over cleverness.
* Avoid hidden behavior.
* Keep abstractions simple.
* Optimize for long-term maintainability.
* Build software that is easy to understand and evolve.

---

## Instruction Hierarchy

When generating code, follow all applicable instructions in this directory.

More specific instructions take precedence over general instructions.

Examples:

```txt id="49i3y0"
feature-components.instructions.md
```

takes precedence over:

```txt id="9i7yxn"
react.instructions.md
```

for files inside:

```txt id="mce1y1"
src/features/**/components/
```

Always follow the most specific instruction available.
