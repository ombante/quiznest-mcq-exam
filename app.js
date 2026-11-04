const LOCAL_KEY = "quiznest-question-bank";
const LETTERS = ["a", "b", "c", "d"];
let questions = [];
let studentName = "";
let currentQuestion = 0;
let answers = [];
let hasImportedQuestionBank = false;

const $ = (selector) => document.querySelector(selector);
const views = {
  home: $("#home-view"),
  exam: $("#exam-view"),
  result: $("#result-view"),
  dashboard: $("#dashboard-view"),
};

function showView(name) {
  Object.values(views).forEach((view) => view.classList.remove("active-view"));
  views[name].classList.add("active-view");
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === (name === "exam" || name === "result" ? "home" : name)));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadQuestions() {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    try { questions = JSON.parse(saved); } catch { questions = []; }
  }
  if (!questions.length) {
    const response = await fetch("questions.json");
    questions = await response.json();
  }
  $("#question-count").textContent = questions.length;
  $("#dashboard-count").textContent = `${questions.length} questions`;
  renderPreview();
}

function renderPreview() {
  $("#preview-list").innerHTML = questions.slice(0, 10).map((question) => `
    <div class="preview-item"><strong>${String(question.id).padStart(2, "0")}</strong><span>${escapeHtml(question.question)}</span></div>
  `).join("") + (questions.length > 10 ? `<div class="preview-item"><strong>…</strong><span>${questions.length - 10} more questions in this exam</span></div>` : "");
}

function startExam(event) {
  event.preventDefault();
  const value = $("#student-name").value.trim();
  if (!value) return;
  studentName = value;
  currentQuestion = 0;
  answers = Array(questions.length).fill(null);
  $("#exam-greeting").textContent = `Good luck, ${studentName.split(" ")[0]}!`;
  showView("exam");
  renderQuestion();
}

function renderQuestion() {
  const question = questions[currentQuestion];
  const answered = answers.filter((answer) => answer !== null).length;
  $("#progress-label").textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  $("#progress-bar").style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  $("#section-label").textContent = currentQuestion < 40 ? "Core Python" : "Advanced Python";
  $("#question-number").textContent = String(currentQuestion + 1).padStart(2, "0");
  $("#question-text").textContent = question.question;
  $("#options-list").innerHTML = question.options.map((option, index) => `
    <div class="option ${answers[currentQuestion] === index ? "selected" : ""}" data-option="${index}" role="button" tabindex="0">
      <span class="option-letter">${LETTERS[index]}</span><span>${escapeHtml(option)}</span>
    </div>
  `).join("");
  $("#options-list").querySelectorAll(".option").forEach((option) => {
    option.addEventListener("click", () => selectAnswer(Number(option.dataset.option)));
    option.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") selectAnswer(Number(option.dataset.option)); });
  });
  $("#previous-button").disabled = currentQuestion === 0;
  $("#next-button").textContent = currentQuestion === questions.length - 1 ? "Review answers →" : "Next question →";
  $("#answered-count").textContent = `${answered} answered`;
  renderMap();
}

function selectAnswer(index) {
  answers[currentQuestion] = index;
  renderQuestion();
}

function renderMap() {
  $("#question-map").innerHTML = questions.map((question, index) => `
    <button class="map-button ${index === currentQuestion ? "current" : ""} ${answers[index] !== null ? "answered" : ""}" data-index="${index}" aria-label="Go to question ${index + 1}">${index + 1}</button>
  `).join("");
  $("#question-map").querySelectorAll(".map-button").forEach((button) => button.addEventListener("click", () => {
    currentQuestion = Number(button.dataset.index); renderQuestion();
  }));
}

function finishExam() {
  const unanswered = answers.filter((answer) => answer === null).length;
  if (unanswered && !window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Finish anyway?`)) return;
  const correct = answers.reduce((total, answer, index) => total + (answer === questions[index].answer ? 1 : 0), 0);
  const percent = Math.round((correct / questions.length) * 100);
  $("#result-name").textContent = studentName;
  $("#score-value").textContent = `${correct}/${questions.length}`;
  $("#score-percent").textContent = `${percent}%`;
  $("#correct-count").textContent = correct;
  $("#incorrect-count").textContent = answers.filter((answer, index) => answer !== null && answer !== questions[index].answer).length;
  $("#unanswered-count").textContent = unanswered;
  $("#result-message").textContent = percent >= 80 ? "Excellent work!" : percent >= 50 ? "Good effort!" : "Keep practicing!";
  $(".score-ring").style.setProperty("--score", `${percent}%`);
  showView("result");
}

async function importPdf(file) {
  const status = $("#upload-status");
  status.textContent = "Reading your PDF…";
  try {
    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += `${content.items.map((item) => item.str).join(" ")}\n`;
    }
    const parsed = parseQuestions(text);
    if (!parsed.length) throw new Error("No compatible MCQs found.");
    questions = parsed;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(questions));
    hasImportedQuestionBank = true;
    $("#question-count").textContent = questions.length;
    $("#dashboard-count").textContent = `${questions.length} questions`;
    renderPreview();
    status.textContent = `Imported ${questions.length} questions successfully.`;
    $("#publish-button").disabled = false;
  } catch (error) {
    status.textContent = `Could not import PDF: ${error.message}`;
  }
}

async function publishQuestionBank() {
  const password = $("#admin-password").value;
  const status = $("#upload-status");
  if (!hasImportedQuestionBank) {
    status.textContent = "Import a new PDF before publishing.";
    return;
  }
  if (!password) {
    status.textContent = "Enter the admin password before publishing.";
    $("#admin-password").focus();
    return;
  }
  const publishButton = $("#publish-button");
  publishButton.disabled = true;
  publishButton.textContent = "Publishing…";
  status.textContent = "Sending the new exam to GitHub…";
  try {
    const response = await fetch("/.netlify/functions/publish-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, questions }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Publishing failed.");
    status.textContent = "Published successfully. Netlify will update all devices shortly.";
    $("#admin-password").value = "";
  } catch (error) {
    status.textContent = `Could not publish: ${error.message}`;
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = "Publish to all devices ↑";
  }
}

function parseQuestions(text) {
  const clean = text.replace(/Python MCQ Practice Set\s*\|\s*Page\s*\d+/gi, " ");
  const pattern = /Q(\d+)\.\s*(.*?)\s+a\)\s*(.*?)\s+b\)\s*(.*?)\s+c\)\s*(.*?)\s+d\)\s*(.*?)\s+Answer:\s*([a-d])\)\s*(.*?)(?=\s+Q\d+\.|$)/gis;
  return [...clean.matchAll(pattern)].map((match) => ({
    id: Number(match[1]),
    question: match[2].replace(/\s+/g, " ").trim(),
    options: match.slice(3, 7).map((option) => option.replace(/\s+/g, " ").trim()),
    answer: LETTERS.indexOf(match[7].toLowerCase()),
  })).filter((question) => question.options.every(Boolean) && question.answer >= 0);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

$("#start-form").addEventListener("submit", startExam);
$("#previous-button").addEventListener("click", () => { if (currentQuestion > 0) { currentQuestion -= 1; renderQuestion(); } });
$("#next-button").addEventListener("click", () => { if (currentQuestion < questions.length - 1) { currentQuestion += 1; renderQuestion(); } else finishExam(); });
$("#finish-button").addEventListener("click", finishExam);
$("#restart-button").addEventListener("click", () => { $("#student-name").value = ""; showView("home"); });
$("#pdf-upload").addEventListener("change", (event) => { if (event.target.files[0]) importPdf(event.target.files[0]); });
$("#publish-button").addEventListener("click", publishQuestionBank);
document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));

loadQuestions().catch((error) => { $("#upload-status").textContent = `Could not load question bank: ${error.message}`; });
