# QuizNest MCQ Exam

A static, mobile-friendly MCQ exam website ready to deploy to Netlify.

## Features

- Student name → start exam → answer MCQs → finish → score such as `30/50`
- Responsive layout for Android, iPhone, tablets, and desktop
- Yellow/red visual theme with simple navigation
- Dashboard that imports a compatible MCQ PDF in the browser using PDF.js
- Imported question banks are saved to the current browser's `localStorage`

## Run locally

Because the app loads JSON with `fetch`, use a local web server:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Publish a new exam to every device

Connect this repository to Netlify with the repository root as the publish directory. Netlify will detect `netlify.toml` and deploy the function automatically.

In Netlify, open **Site configuration → Environment variables** and add:

- `ADMIN_PASSWORD`: a strong private password for publishing
- `GITHUB_TOKEN`: a fine-grained GitHub token with **Contents: Read and write** access to this repository
- `GITHUB_OWNER`: `ombante`
- `GITHUB_REPO`: `quiznest-mcq-exam`
- `GITHUB_BRANCH`: `main`

Only the Netlify Function receives the GitHub token. Do not put it in `app.js` or any browser-visible file.

To publish: open Dashboard, upload a compatible MCQ PDF, enter the admin password, and click **Publish to all devices**. The function commits the generated `questions.json` to GitHub, and Netlify automatically redeploys the site. The new exam replaces the old live exam after deployment completes. The previous version remains available in Git history.

The dashboard imports PDFs in the browser and stores the current bank in localStorage. A user cannot publish without the server-side admin password and configured GitHub token.
