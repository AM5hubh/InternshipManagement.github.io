# InternshipManagement.github.io

## New features added: Badges & Automated Certificate Generation

Backend additions (routes in `/backend/routers/candidate.js`):

- PATCH `/candidate/badge` - body: { candidateID, badgeName, points, assignedBy }

  - Assigns a badge to a candidate and increments their `xp`.

- GET `/candidate/:id/certificate?download=1` - generates a PDF certificate for the candidate.
  - If `download=1` the server responds with a PDF download. Otherwise it returns `{ pdfBase64 }`.

Backend dependency: `pdfkit` was added. From the `backend` folder run:

```
npm install
npm install pdfkit
```

Frontend: `internship-management` updated to show badges and total XP on the intern profile. A small manager UI was added to assign badges and to download the auto-generated certificate.

Security note: these endpoints are protected by the project's `authentication` middleware but double-check that only authorized managers can call the badge assignment route in production.
