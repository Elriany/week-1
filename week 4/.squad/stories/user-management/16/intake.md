> **Fetched from azure:** [16](https://dev.azure.com/elriany2017/AZM%20SQUAD%20CRM/_workitems/edit/16)  
> *Fetched 2026-08-25T13:10:36.224Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** US02 - Authentication, Users, Roles & Permissions  
**Type:** User Story  
**Status:** New  
**Assignee:** Muhammad Ahmad

### Description

Implement secure authentication and authorization for CRM users.  

Implementation Tasks:  

1. Create User, Role and Permission entities  

2. Implement JWT authentication  

3. Implement login and current-user endpoints  

4. Implement role and permission authorization 

5. Implement user management APIs  

6. Implement branch and department assignment  

7. Create login screen and authentication flow  

8. Create user and role management screens  

9. Implement secure password handling and protected API access  

10. Test authentication, authorization and permission scenarios

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/user-management/16/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `user-management`

## Tracker (metadata only)

- **Tracker type:** `azure`
- **Work item id:** `16` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User Story`
- **Status:** `New`
- **Assignee:** `Muhammad Ahmad`
- **Labels:** ``

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
US02 - Authentication, Users, Roles & Permissions
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
Implement secure authentication and authorization for CRM users.  

Implementation Tasks:  

1. Create User, Role and Permission entities  

2. Implement JWT authentication  

3. Implement login and current-user endpoints  

4. Implement role and permission authorization 

5. Implement user management APIs  

6. Implement branch and department assignment  

7. Create login screen and authentication flow  

8. Create user and role management screens  

9. Implement secure password handling and protected API access  

10. Test authentication, authorization and permission scenarios
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
JWT authentication; users, roles and permissions; Administrator, Manager, Supervisor, Agent and Customer roles; branch and department assignment; activation/deactivation; secure password handling; protected APIs.
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
