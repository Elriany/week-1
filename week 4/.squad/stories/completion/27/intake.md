> **Fetched from azure:** [27](https://dev.azure.com/elriany2017/AZM%20SQUAD%20CRM/_workitems/edit/27)  
> *Fetched 2026-08-27T20:17:28.273Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** US13 - Essential CRM Completion & Integrated User Experience  
**Type:** User Story  
**Status:** New  
**Assignee:** Muhammad Ahmad

### Description

Goal:
Complete the most valuable parts of the remaining CRM scope (US05 through US12) in a simplified educational form, prioritizing a coherent and useful product over production-grade infrastructure or external services.

Implementation Tasks:

1. Agent Workspace & Dashboard
- Create a simple agent dashboard showing My Tickets, Unassigned Tickets, overdue tickets and basic workload counts.
- Add practical filters by status, priority and assignment.
- Add quick navigation from dashboard items to the existing Ticket Management screens.
- Reuse the existing ticket and customer data instead of creating duplicate business logic.

2. Customer Communication
- Add a simple customer support web form that creates a ticket using the existing Ticket Management module.
- Store the communication channel as a basic value such as Web.
- Keep the communication design extensible in code, but do not implement Email, WhatsApp, SMS, Live Chat or external providers.
- Validate the form and show a clear success/error result.

3. Knowledge Base / FAQ
- Add a lightweight Knowledge Base with categories, articles/FAQs and publish/unpublish status.
- Implement basic search and category filtering.
- Allow agents to access published articles from the ticket workspace.
- Allow customers to access published FAQ content where appropriate.
- Keep the data model and UI simple; no advanced search engine is required.

4. Customer Self-Service
- Build a simple customer portal using the authentication already implemented.
- Allow customers to create tickets, view their own tickets, open ticket details and see ticket history.
- Enforce customer ownership so a customer cannot access another customer's tickets.
- Add access to the published FAQ/Knowledge Base.
- Reuse existing Customer and Ticket APIs and components.

5. Simplified SLA & Automation
- Add a minimal SLA configuration containing response/resolution targets.
- Calculate a simple SLA status for tickets such as On Track, At Risk and Breached.
- Display SLA information on ticket details and the agent dashboard.
- Implement only simple rule-based escalation/notification behavior inside the application; no external notification service is required.

6. Reports & Management View
- Add a lightweight management dashboard using existing CRM data.
- Include ticket counts by status, priority and category.
- Include basic agent workload and resolution statistics.
- Include simple SLA performance indicators.
- Add a date-range filter where useful.
- Prefer simple SQL/API queries and avoid heavy reporting infrastructure.

7. Basic Administration
- Add simple screens/APIs for managing branches, departments, categories, priorities and statuses where these are required by the existing modules.
- Reuse existing authorization and prevent unauthorized users from changing configuration.

8. Basic Auditability
- Add a lightweight audit log for important actions such as ticket status changes, assignment changes and key administration changes.
- Store user, action, timestamp and relevant entity information.
- Keep the implementation simple and local to the CRM database.

9. Integration Readiness Without External Services
- Keep clear service interfaces for future integrations, but do not implement external ERP, Email, WhatsApp, SMS or other third-party integrations.
- Do not introduce queues, microservices, cloud services or additional infrastructure unless absolutely required by the existing application.

10. Module Integration & End-to-End Flow
- Ensure the main flow works as one product:
  Customer → Login → Create Ticket → Ticket Lifecycle → Agent Workspace → Knowledge Base → SLA → Resolution → Customer View.
- Ensure Customer, Ticket, User/Role, Knowledge Base, Dashboard and Administration modules reuse the same entities and APIs.
- Remove duplicated logic introduced during implementation.
- Ensure navigation between related screens is clear and consistent.

Definition of Done:
- The remaining scope is implemented as a practical educational CRM rather than a production-scale platform.
- No external paid/complex services are required.
- Existing US01-US04 functionality remains working.
- The modules are connected through real application flows and shared data.
- The product can demonstrate a complete support scenario from customer ticket creation to agent handling and resolution.

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/completion/27/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `completion`

## Tracker (metadata only)

- **Tracker type:** `azure`
- **Work item id:** `27` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User Story`
- **Status:** `New`
- **Assignee:** `Muhammad Ahmad`
- **Labels:** ``

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
US13 - Essential CRM Completion & Integrated User Experience
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
Goal:
Complete the most valuable parts of the remaining CRM scope (US05 through US12) in a simplified educational form, prioritizing a coherent and useful product over production-grade infrastructure or external services.

Implementation Tasks:

1. Agent Workspace & Dashboard
- Create a simple agent dashboard showing My Tickets, Unassigned Tickets, overdue tickets and basic workload counts.
- Add practical filters by status, priority and assignment.
- Add quick navigation from dashboard items to the existing Ticket Management screens.
- Reuse the existing ticket and customer data instead of creating duplicate business logic.

2. Customer Communication
- Add a simple customer support web form that creates a ticket using the existing Ticket Management module.
- Store the communication channel as a basic value such as Web.
- Keep the communication design extensible in code, but do not implement Email, WhatsApp, SMS, Live Chat or external providers.
- Validate the form and show a clear success/error result.

3. Knowledge Base / FAQ
- Add a lightweight Knowledge Base with categories, articles/FAQs and publish/unpublish status.
- Implement basic search and category filtering.
- Allow agents to access published articles from the ticket workspace.
- Allow customers to access published FAQ content where appropriate.
- Keep the data model and UI simple; no advanced search engine is required.

4. Customer Self-Service
- Build a simple customer portal using the authentication already implemented.
- Allow customers to create tickets, view their own tickets, open ticket details and see ticket history.
- Enforce customer ownership so a customer cannot access another customer's tickets.
- Add access to the published FAQ/Knowledge Base.
- Reuse existing Customer and Ticket APIs and components.

5. Simplified SLA & Automation
- Add a minimal SLA configuration containing response/resolution targets.
- Calculate a simple SLA status for tickets such as On Track, At Risk and Breached.
- Display SLA information on ticket details and the agent dashboard.
- Implement only simple rule-based escalation/notification behavior inside the application; no external notification service is required.

6. Reports & Management View
- Add a lightweight management dashboard using existing CRM data.
- Include ticket counts by status, priority and category.
- Include basic agent workload and resolution statistics.
- Include simple SLA performance indicators.
- Add a date-range filter where useful.
- Prefer simple SQL/API queries and avoid heavy reporting infrastructure.

7. Basic Administration
- Add simple screens/APIs for managing branches, departments, categories, priorities and statuses where these are required by the existing modules.
- Reuse existing authorization and prevent unauthorized users from changing configuration.

8. Basic Auditability
- Add a lightweight audit log for important actions such as ticket status changes, assignment changes and key administration changes.
- Store user, action, timestamp and relevant entity information.
- Keep the implementation simple and local to the CRM database.

9. Integration Readiness Without External Services
- Keep clear service interfaces for future integrations, but do not implement external ERP, Email, WhatsApp, SMS or other third-party integrations.
- Do not introduce queues, microservices, cloud services or additional infrastructure unless absolutely required by the existing application.

10. Module Integration & End-to-End Flow
- Ensure the main flow works as one product:
  Customer → Login → Create Ticket → Ticket Lifecycle → Agent Workspace → Knowledge Base → SLA → Resolution → Customer View.
- Ensure Customer, Ticket, User/Role, Knowledge Base, Dashboard and Administration modules reuse the same entities and APIs.
- Remove duplicated logic introduced during implementation.
- Ensure navigation between related screens is clear and consistent.

Definition of Done:
- The remaining scope is implemented as a practical educational CRM rather than a production-scale platform.
- No external paid/complex services are required.
- Existing US01-US04 functionality remains working.
- The modules are connected through real application flows and shared data.
- The product can demonstrate a complete support scenario from customer ticket creation to agent handling and resolution.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
- Agent can see and manage relevant ticket workload.
- Customer can submit a ticket through the web form.
- Customer can view only their own tickets.
- Agent and customer can use the Knowledge Base/FAQ.
- Tickets display a simple SLA status.
- Management can see useful CRM metrics.
- Authorized users can manage required CRM configuration.
- Important ticket changes are auditable.
- US01-US04 continue to work.
- No external integration or complex infrastructure is required.
- The major CRM modules work together in one coherent end-to-end flow.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| *(e.g. `attachments/flow.png`)* | *(e.g. UX flow)* |

*(Add rows per file. If none, write "None.")*

---

## Dependencies

- **Blocked by / related ids:** (tracker ids only; optional short note)
- **Depends on code areas or other stories:**

## Extra notes (optional)

- Anything not captured above (e.g. chat context) — keep short.

## Technical hints (optional)

- APIs, screens, services already discussed. Repos/roots: `.`. Primary language: `typescript`.

## Out of scope

- What this story explicitly does **not** cover:
