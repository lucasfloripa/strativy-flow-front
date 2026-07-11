---
description: Rules and conventions for API communication, repositories and HTTP clients.
applyTo: "**/*.{ts,tsx}"
---

# API Instructions

## Purpose

API communication should be centralized, predictable, and easy to maintain.

Components should never communicate directly with external services.

All communication with external systems must flow through the application's service layer.

---

## Communication Flow

Always follow the architecture:

```txt
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

Avoid bypassing layers.

Components should not call APIs directly.

---

## HTTP Client

Centralize HTTP configuration in a single location.

Examples:

```txt
core/api/
```

Responsibilities:

* Base URL
* Authentication headers
* Interceptors
* Error handling
* Request configuration
* Response configuration

Avoid creating HTTP clients inside features.

---

## Service Ownership

Services are responsible for communicating with APIs.

Preferred:

```ts
LeadService.getLeads()
LeadService.createLead()
LeadService.updateLead()
```

Avoid:

```tsx
fetch(...)
axios(...)
```

inside components.

Avoid direct API calls inside UI code.

---

## API Contracts

Define request and response types explicitly.

Preferred:

```ts
type CreateLeadRequest = {
  name: string;
};

type LeadResponse = {
  id: string;
  name: string;
};
```

Avoid untyped API communication.

---

## Request Models

Request models represent data sent to the backend.

Examples:

```ts
CreateLeadRequest
UpdateLeadRequest
LoginRequest
```

Keep request models explicit and strongly typed.

---

## Response Models

Response models represent data received from the backend.

Examples:

```ts
LeadResponse
UserResponse
BoardResponse
```

Avoid exposing raw API responses directly to UI layers.

---

## Mapping

Services may transform API contracts into application models.

Preferred:

```txt
Backend Response
↓
Service Mapping
↓
Domain Model
↓
UI
```

This prevents backend implementation details from leaking into the application.

---

## Error Handling

Errors should be handled consistently.

Services may normalize API errors before exposing them.

Avoid:

```ts
catch (error) {
  console.log(error);
}
```

without proper handling.

Consumers should receive predictable error structures.

---

## Authentication

Authentication concerns should be centralized.

Examples:

* Token injection
* Authorization headers
* Session handling
* Token refresh

Do not duplicate authentication logic across services.

---

## Retries

Retry logic should be centralized when required.

Avoid implementing retries in components.

---

## Pagination

Pagination logic should be explicit.

Examples:

```ts
page
pageSize
cursor
```

Avoid hidden pagination behavior.

---

## Filtering

Filtering and sorting parameters should be represented through typed contracts.

Preferred:

```ts
type GetLeadsParams = {
  page: number;
  search?: string;
  status?: LeadStatus;
};
```

Avoid passing arbitrary objects.

---

## Endpoint Ownership

Group API operations by business domain.

Preferred:

```txt
LeadService
UserService
BoardService
AuthService
```

Avoid generic service structures.

Examples:

```txt
ApiService
RequestService
HttpHelper
```

---

## Side Effects

API communication is a side effect.

Keep side effects isolated to:

* Services
* Data fetching layers

Avoid side effects inside presentation components.

---

## Caching

Caching strategies should be centralized.

Avoid manually duplicating cache logic throughout the application.

---

## Architectural Principles

* Components never call APIs directly.
* Hooks orchestrate data usage.
* Services own API communication.
* API clients own HTTP configuration.
* Define explicit request and response contracts.
* Normalize errors consistently.
* Keep authentication centralized.
* Prevent backend contracts from leaking into UI code.
* Favor predictability over convenience.
