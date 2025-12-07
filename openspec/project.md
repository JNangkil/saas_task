

# **Project Context**

## **Purpose**

This project aims to build a **multi-tenant SaaS task management system** similar to Monday.com.
The system allows organizations to create workspaces, boards, and dynamic task tables with customizable columns, statuses, priorities, deadlines, and workflow views (Table, Kanban, Calendar). It also includes collaboration tools, notifications, analytics, and a Super Admin panel for managing tenants and subscriptions.

The primary goals are:

* Provide a flexible, dynamic task management UI with customizable fields.
* Enable teams to organize work across multiple boards and workspaces.
* Support SaaS features such as subscription billing, tenant isolation, and usage monitoring.
* Offer real-time collaboration features and activity tracking.
* Ensure enterprise-level security and role-based access control.

---

## **Tech Stack**

* **Frontend:** Angular
* **Backend:** Laravel (REST API)
* **Auth:** JWT Authentication (optional MFA)
* **Database:** MySQL/PostgreSQL (single-database multi-tenant)
* **Real-time (Optional):** Laravel Broadcasting / WebSockets
* **File Storage:** Laravel Filesystem (local or S3)
* **Build & Deployment:** Docker, CI/CD pipelines

---

## **Project Conventions**

### **Code Style**

#### **Frontend (Angular)**

* Use TypeScript strict mode.
* Use Angular recommended best practices and CLI structure.
* Follow consistent naming conventions:

  * Components: `TaskTableComponent`
  * Services: `TaskService`
  * Interfaces: `ITask`, `IWorkspace`
* Use ESLint + Prettier for formatting.
* Use Angular Reactive Forms over Template Forms for complex UIs.
* Use RxJS Observables for state updates and subscriptions.

#### **Backend (Laravel)**

* PSR-12 coding standards.
* Controller-Service-Repository pattern (optional but encouraged).
* Use Form Request classes for validation.
* Use Laravel Policies for authorization.
* Use Laravel Resources for API response formatting.

---

### **Architecture Patterns**

* **Multi-Tenant Architecture (Single Database):**

  * All entities are tenant-scoped: tenants → workspaces → boards → tasks.
  * Middleware ensures tenant isolation.
* **Modular Feature Architecture:**

  * Each feature (tasks, boards, notifications, analytics) is isolated.
* **REST API Layer with JWT Auth**

  * Stateless authentication.
  * Route-based role & permission checks.
* **Event-Driven Components**

  * Activity logs, notifications, and real-time updates triggered by Laravel Events.
* **Frontend State Management**

  * Angular services + RxJS subjects or NgRx (optional) for managing global state (tenant, workspace, board).

---

### **Testing Strategy**

#### **Backend Tests**

* PHPUnit for unit and feature tests.
* API endpoint tests for all task/board/workspace operations.
* Authorization tests using Laravel Policies.
* Billing and subscription webhook tests.

#### **Frontend Tests**

* Angular Jasmine/Karma unit tests for components and services.
* Cypress or Playwright for end-to-end tests:

  * Task creation
  * Drag-and-drop operations
  * Board switching
  * Workspace user invitations

#### **Integration Testing**

* API contract tests between Angular and Laravel.
* Multi-tenant isolation tests.

---

### **Git Workflow**

* **Branching Strategy:**

  * `main` → production
  * `develop` → staging
  * `feature/*` → new features
  * `hotfix/*` → urgent fixes in production

* **Commit Message Convention:**

  * Use Conventional Commits:

    * `feat: add dynamic columns`
    * `fix: task duplication bug`
    * `refactor: improve board filtering`
    * `chore: update dependencies`

* **Pull Requests:**

  * Every PR must include:

    * Summary of changes
    * Link to feature spec / task
    * Screenshots for UI changes
    * Must pass CI tests before merging

---

## **Domain Context**

This system models the workflow of project-driven teams. Key domain concepts:

* **Tenant:** A company or organization using the SaaS platform.
* **Workspace:** A top-level grouping inside a tenant (e.g., Marketing, Dev Team).
* **Board:** A project or workflow (e.g., Sprint Backlog, Sales Pipeline).
* **Task:** The core unit of work with customizable fields.
* **Columns:** User-defined fields (status, priority, labels, date, text, user, etc.).
* **Views:**

  * Table (spreadsheet-style)
  * Kanban (status-based lanes)
  * Calendar (tasks based on due dates)
* **User Roles:** Owner, Admin, Member, Viewer.
* **Subscription Plans:** Control access limits (users, workspaces, features).
* **Super Admin:** Manages all tenants and system health independently from tenants.

---

## **Important Constraints**

* Must support **multi-tenant separation**, ensuring no tenant can access another tenant's data.
* Must support **SaaS billing and plan enforcement** (limits on users, workspaces, storage, etc.).
* Must support **real-time UI updates** for task changes (if enabled by server).
* System must remain performant with:

  * 10,000+ tasks per tenant
  * Multiple concurrent users editing boards
* All actions must be logged for activity/audit trails.
* Support secure file uploads with size limits and safe MIME types.
* Must comply with basic data privacy rules (GDPR-friendly design).

---

## **External Dependencies**

* **Payment Gateway (Stripe, Paddle, or similar)**

  * Subscription management
  * Webhook events for payment success/failure

* **Email Delivery Service**

  * SendGrid / Mailgun / SES for notifications and password resets

* **Cloud File Storage (Optional)**

  * AWS S3 or DigitalOcean Spaces for attachments

* **WebSockets Provider (Optional)**

  * Pusher, Laravel WebSockets, or similar for real-time updates

* **Third-Party Services (optional future integrations)**

  * Google Calendar
  * Slack webhooks

---

## **DONE — This is a fully filled OpenSpec `project.md` file.**
