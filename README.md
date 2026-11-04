# QuizNest MCQ Exam

A static, mobile-friendly MCQ exam website ready to deploy to Netlify.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Netlify

Connect this repository to Netlify. No build command is required; use the repository root as the publish directory.

The dashboard imports compatible MCQ PDFs in the browser and stores them in localStorage. PDFs are not uploaded to a server.