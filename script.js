// ─────────────────────────────────────────────
//  CONFLICT MIRROR — FINAL STABLE VERSION
// ─────────────────────────────────────────────

// 🔑 ADD YOUR GEMINI API KEY
const GEMINI_API_KEY = "AIzaSyDBoAuHGp65-TXcFNV0rj8Uefh-rlqYjv0";

// ✅ LATEST WORKING MODEL + ENDPOINT
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── DOM Elements ──
const conversationInput = document.getElementById("conversation");
const analyzeBtn = document.getElementById("analyzeBtn");
const errorMsg = document.getElementById("errorMsg");
const loader = document.getElementById("loader");
const results = document.getElementById("results");

const escalationContent = document.getElementById("escalationContent");
const emotionsContent = document.getElementById("emotionsContent");
const faultContent = document.getElementById("faultContent");
const rewriteContent = document.getElementById("rewriteContent");

// ── Event Listener ──
analyzeBtn.addEventListener("click", handleAnalyze);

// ─────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────
async function handleAnalyze() {
  const text = conversationInput.value.trim();

  if (!text) {
    showError("Paste a conversation first.");
    return;
  }

  if (text.length < 20) {
    showError("Conversation too short.");
    return;
  }

  showError("");
  setLoading(true);

  try {
    const data = await callGemini(text);
    renderResults(data);
  } catch (err) {
    console.error("ERROR:", err);
    showError(err.message || "Something went wrong.");
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
//  GEMINI API CALL (ROBUST VERSION)
// ─────────────────────────────────────────────
async function callGemini(conversation) {
  const prompt = `
Analyze the conversation and respond clearly with:

1. Escalation (how conflict grew)
2. Emotional intent of both people
3. Fault percentage (must total 100%)
4. A better rewritten version

Keep it structured and readable.

Conversation:
${conversation}
`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800
      }
    })
  });

  const data = await response.json();

  console.log("Gemini RAW:", data);

  if (!response.ok) {
    throw new Error(data?.error?.message || "API request failed");
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response from Gemini");
  }

  return text;
}

// ─────────────────────────────────────────────
//  RENDER RESULTS (CLEAN FORMAT)
// ─────────────────────────────────────────────
function renderResults(text) {
  const sections = text.split(/\n\d\.\s/);

  escalationContent.innerHTML = sections[1] || text;
  emotionsContent.innerHTML = sections[2] || text;
  faultContent.innerHTML = sections[3] || text;
  rewriteContent.innerHTML = sections[4] || text;

  results.classList.remove("hidden");
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
}

function setLoading(on) {
  loader.classList.toggle("hidden", !on);
}
