// =============================================================
//  CONFLICT MIRROR — script.js
//  ⚙  INSERT YOUR GEMINI API KEY BELOW (line 5)
// =============================================================

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // 👈 Replace this

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ---- LOADING MESSAGES ----
const LOADING_STEPS = [
  ["Analyzing conversation…",        "Reading between the lines"],
  ["Detecting escalation patterns…", "Tracing where things went wrong"],
  ["Uncovering emotional needs…",    "What were they really asking for?"],
  ["Assigning responsibility…",      "Finding the conflict's centre of gravity"],
  ["Rewriting with empathy…",        "Imagining a kinder version"],
];

// ---- STATE ----
let loadingInterval = null;

// ---- DOM REFS ----
const textarea       = document.getElementById("conversationInput");
const charCounter    = document.getElementById("charCounter");
const analyzeBtn     = document.getElementById("analyzeBtn");
const errorMessage   = document.getElementById("errorMessage");
const loadingState   = document.getElementById("loadingState");
const loadingMain    = document.getElementById("loadingMain");
const loadingSub     = document.getElementById("loadingSub");
const outputSection  = document.getElementById("outputSection");

// ---- CHARACTER COUNTER ----
textarea.addEventListener("input", () => {
  const len = textarea.value.length;
  charCounter.textContent = `${len.toLocaleString()} / 4,000`;
  charCounter.style.color = len > 3500 ? "#E87D7D" : "var(--text-tertiary)";
  if (errorMessage.textContent) clearError();
});

// ---- HELPERS ----
function showError(msg) {
  errorMessage.textContent = msg;
}

function clearError() {
  errorMessage.textContent = "";
}

function setLoading(on) {
  if (on) {
    loadingState.classList.add("visible");
    analyzeBtn.disabled = true;
    analyzeBtn.querySelector(".btn-text").textContent = "Analyzing…";

    let step = 0;
    updateLoadingText(step);
    loadingInterval = setInterval(() => {
      step = (step + 1) % LOADING_STEPS.length;
      updateLoadingText(step);
    }, 2200);
  } else {
    loadingState.classList.remove("visible");
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector(".btn-text").textContent = "Analyze Conversation";
    clearInterval(loadingInterval);
  }
}

function updateLoadingText(step) {
  loadingMain.style.opacity = 0;
  loadingSub.style.opacity  = 0;
  setTimeout(() => {
    loadingMain.textContent   = LOADING_STEPS[step][0];
    loadingSub.textContent    = LOADING_STEPS[step][1];
    loadingMain.style.opacity = 1;
    loadingSub.style.opacity  = 1;
  }, 200);
  loadingMain.style.transition = "opacity 0.3s";
  loadingSub.style.transition  = "opacity 0.3s";
}

// ---- PROMPT BUILDER ----
function buildPrompt(conversation) {
  return `You are an expert conflict analyst and communication therapist. Analyze the following conversation with deep psychological insight.

CONVERSATION:
"""
${conversation}
"""

Your task is to produce a thorough, empathetic, and realistic analysis. Return ONLY a single valid JSON object — no preamble, no markdown, no explanation outside the JSON.

JSON STRUCTURE:
{
  "personAName": "detected or inferred name for Person A (or 'Person A' if unclear)",
  "personBName": "detected or inferred name for Person B (or 'Person B' if unclear)",
  "escalation": "2–4 sentence analysis of how the conflict escalated. Identify the trigger, the turning points, and what communication patterns caused it to intensify rather than de-escalate. Be specific and insightful.",
  "personAEmotions": "2–3 sentences describing Person A's hidden emotional needs, fears, and what they were really trying to communicate beneath their words. Use empathetic, non-clinical language.",
  "personBEmotions": "2–3 sentences describing Person B's hidden emotional needs, fears, and what they were really trying to communicate beneath their words. Use empathetic, non-clinical language.",
  "fault": {
    "personA": <integer 0–100>,
    "personB": <integer 0–100, must sum to exactly 100 with personA's value>
  },
  "faultNote": "1–2 sentences explaining the fault distribution in a balanced, non-judgmental way. Acknowledge what each person contributed to the conflict.",
  "rewrite": [
    { "speaker": "PersonAName", "text": "rewritten line..." },
    { "speaker": "PersonBName", "text": "rewritten line..." }
  ]
}

RULES:
- personA and personB fault values MUST sum to exactly 100.
- The rewrite array must contain 4–10 dialogue exchanges, alternating speakers naturally.
- The rewrite should demonstrate nonviolent communication: expressing needs clearly, listening actively, avoiding blame, using "I" statements.
- The rewrite should feel natural and human — not robotic or overly therapeutic.
- If the conversation has only one side or is ambiguous, make reasonable inferences.
- Output ONLY the JSON. No markdown fences. No extra text.`;
}

// ---- MAIN ANALYSIS FUNCTION ----
async function analyzeConversation() {
  const text = textarea.value.trim();

  // Validation
  if (!text) {
    showError("Please paste a conversation before analyzing.");
    textarea.focus();
    return;
  }
  if (text.length < 30) {
    showError("The conversation seems too short. Please paste a more complete exchange.");
    return;
  }
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    showError("⚙ Add your Gemini API key in script.js (line 5) to get started.");
    return;
  }

  clearError();
  outputSection.classList.remove("visible");
  setLoading(true);

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text) }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1800,
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `API error ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error("No response received from the AI. Try again.");

    // Strip potential markdown fences
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // Attempt to extract JSON from response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error("Could not parse AI response. Please try again.");
    }

    // Validate required fields
    const required = ["escalation", "personAEmotions", "personBEmotions", "fault", "rewrite"];
    for (const field of required) {
      if (!result[field]) throw new Error(`Incomplete response from AI (missing ${field}). Please retry.`);
    }

    // Normalize fault to sum to 100
    const total = (result.fault.personA || 0) + (result.fault.personB || 0);
    if (total !== 100 && total > 0) {
      result.fault.personA = Math.round((result.fault.personA / total) * 100);
      result.fault.personB = 100 - result.fault.personA;
    }

    setLoading(false);
    renderResults(result);

  } catch (err) {
    setLoading(false);
    showError(`Error: ${err.message}`);
    console.error("Conflict Mirror error:", err);
  }
}

// ---- RENDER RESULTS ----
function renderResults(data) {
  const nameA = data.personAName || "Person A";
  const nameB = data.personBName || "Person B";
  const pctA  = data.fault.personA;
  const pctB  = data.fault.personB;

  // — Escalation
  document.getElementById("escalationText").textContent = data.escalation;

  // — Emotions
  document.getElementById("personALabel").textContent = nameA;
  document.getElementById("personBLabel").textContent = nameB;
  document.getElementById("personAText").textContent   = data.personAEmotions;
  document.getElementById("personBText").textContent   = data.personBEmotions;

  // — Fault names
  document.getElementById("faultNameA").textContent = nameA;
  document.getElementById("faultNameB").textContent = nameB;
  document.getElementById("faultPctA").textContent  = `${pctA}%`;
  document.getElementById("faultPctB").textContent  = `${pctB}%`;
  if (data.faultNote) document.getElementById("faultNote").textContent = data.faultNote;

  // — Rewrite chat bubbles
  const chatEl = document.getElementById("rewriteChat");
  chatEl.innerHTML = "";

  // Determine which speaker is "right" (blue, second speaker)
  const speakers = data.rewrite.map(m => m.speaker);
  const uniqueSpeakers = [...new Set(speakers)];
  const rightSpeaker = uniqueSpeakers[1] || "";

  data.rewrite.forEach((msg, i) => {
    const isRight = msg.speaker === rightSpeaker;
    const bubble  = document.createElement("div");
    bubble.className = `chat-bubble ${isRight ? "right" : "left"}`;
    bubble.style.animationDelay = `${i * 60}ms`;

    const speakerEl = document.createElement("div");
    speakerEl.className = "bubble-speaker";
    speakerEl.textContent = msg.speaker;

    const textEl = document.createElement("div");
    textEl.className = "bubble-text";
    textEl.textContent = msg.text;

    bubble.appendChild(speakerEl);
    bubble.appendChild(textEl);
    chatEl.appendChild(bubble);
  });

  // — Show output section
  outputSection.classList.add("visible");

  // — Animate fault bars after a short delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById("faultBarA").style.width = `${pctA}%`;
      document.getElementById("faultBarB").style.width = `${pctB}%`;
    }, 400);
  });

  // — Scroll to results
  setTimeout(() => {
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);

  // — Store rewrite for copy
  window._lastRewrite = data.rewrite.map(m => `${m.speaker}: ${m.text}`).join("\n");
}

// ---- COPY REWRITE ----
function copyRewrite() {
  if (!window._lastRewrite) return;
  navigator.clipboard.writeText(window._lastRewrite).then(() => {
    const btn = document.querySelector(".copy-btn");
    btn.textContent = "Copied ✓";
    btn.style.color = "var(--gold)";
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.style.color = "";
    }, 2000);
  }).catch(() => {
    showError("Could not copy to clipboard.");
  });
}

// ---- RESET ----
function resetApp() {
  outputSection.classList.remove("visible");
  textarea.value = "";
  charCounter.textContent = "0 / 4,000";
  clearError();

  // Reset fault bars
  document.getElementById("faultBarA").style.width = "0%";
  document.getElementById("faultBarB").style.width = "0%";

  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => textarea.focus(), 400);
}

// ---- KEYBOARD SHORTCUT ----
// Cmd/Ctrl + Enter to analyze
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    if (!analyzeBtn.disabled) analyzeConversation();
  }
});

// ---- INIT ----
textarea.focus();
