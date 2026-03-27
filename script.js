// ─────────────────────────────────────────────
//  CONFLICT MIRROR — CLEAN WORKING VERSION
// ─────────────────────────────────────────────

// 🔑 YOUR GEMINI API KEY
const GEMINI_API_KEY = "AIzaSyDBoAuHGp65-TXcFNV0rj8Uefh-rlqYjv0";

// ✅ CORRECT API ENDPOINT
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

// ── Button Click ──
analyzeBtn.addEventListener("click", handleAnalyze);

async function handleAnalyze() {
  const text = conversationInput.value.trim();

  if (!text) {
    showError("Paste a conversation first.");
    return;
  }

  showError("");
  setLoading(true);

  try {
    const data = await callGemini(text);
    renderResults(data);
  } catch (err) {
    console.error(err);
    showError("API error. Check key or connection.");
  } finally {
    setLoading(false);
  }
}

// ─────────────────────────────────────────────
//  GEMINI API CALL (SIMPLIFIED & STABLE)
// ─────────────────────────────────────────────
async function callGemini(conversation) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Analyze this conversation and explain:
1. What caused escalation
2. What each person actually felt
3. Who is more at fault (%)
4. Rewrite the conversation in a better way

Conversation:
${conversation}`
            }
          ]
        }
      ]
    })
  });

  const json = await response.json();

  console.log("Gemini response:", json);

  const output = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!output) throw new Error("No response from Gemini");

  return output;
}

// ─────────────────────────────────────────────
//  RENDER RESULTS (SIMPLE)
// ─────────────────────────────────────────────
function renderResults(text) {
  escalationContent.innerHTML = text;
  emotionsContent.innerHTML = text;
  faultContent.innerHTML = text;
  rewriteContent.innerHTML = text;

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
