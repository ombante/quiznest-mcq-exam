const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.URL || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(statusCode, body) {
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: jsonHeaders, body: "" };
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." });

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = "main", ADMIN_PASSWORD } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !ADMIN_PASSWORD) {
    return response(500, { error: "Publishing is not configured in Netlify." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid request body." });
  }

  if (!payload.password || payload.password !== ADMIN_PASSWORD) {
    return response(401, { error: "Incorrect admin password." });
  }
  if (!Array.isArray(payload.questions) || !payload.questions.length) {
    return response(400, { error: "The question bank is empty." });
  }
  if (payload.questions.some((question) => !question.question || !Array.isArray(question.options) || question.options.length !== 4 || !Number.isInteger(question.answer))) {
    return response(400, { error: "The question bank format is invalid." });
  }

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/questions.json`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "QuizNest-Netlify-Function",
  };

  try {
    const currentResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers });
    let sha;
    if (currentResponse.ok) {
      sha = (await currentResponse.json()).sha;
    } else if (currentResponse.status !== 404) {
      return response(502, { error: "Could not read the existing question bank from GitHub." });
    }

    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Publish updated question bank",
        content: Buffer.from(`${JSON.stringify(payload.questions, null, 2)}\n`, "utf8").toString("base64"),
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!updateResponse.ok) {
      return response(502, { error: "GitHub rejected the question bank update." });
    }
    return response(200, { ok: true });
  } catch (error) {
    return response(502, { error: `GitHub request failed: ${error.message}` });
  }
};
