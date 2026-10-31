const Department = require('../models/Department');
const Category = require('../models/Category');
const { callGemini, isConfigured } = require('../utils/geminiClient');

// Deterministic, rule-based recommendation engine used whenever no Gemini
// API key is configured, or when the Gemini call fails/returns something we
// can't parse — the assistant should never simply stop working. It matches
// the citizen's free-text description against each department's
// keywords/services/complaintCategories (see Department model) rather than a
// hardcoded department list in the frontend, per the "smart department
// recommendation" requirement.

const URGENT_WORDS = ['emergency', 'urgent', 'danger', 'life threat', 'fire', 'accident', 'collapsed', 'died', 'death', 'injur', 'critical', 'leak', 'electrocut'];
const HIGH_WORDS = ['not working', 'no water', 'no power', 'no electricity', 'overflow', 'contaminat', 'unsafe', 'threat', 'harassment', 'theft', 'assault'];
const LOW_WORDS = ['minor', 'small', 'cosmetic', 'suggestion', 'request'];

// Corruption/bribery gets its own detection pass — it should be flagged as
// Corruption + High priority regardless of which department it names,
// because a bribery demand is urgent and sensitive no matter the sector.
const CORRUPTION_WORDS = [
  'bribe', 'bribery', 'kickback', 'demanding money', 'asking for money', 'asked for money',
  'wants money', 'pay him', 'pay her', 'under the table', 'illegal payment', 'corrupt',
  'extort', 'demanded a bribe', 'unofficial payment', 'speed money',
];

const scoreDepartment = (text, dept) => {
  const haystack = text.toLowerCase();
  const bag = [
    ...(dept.keywords || []),
    ...(dept.services || []),
    ...(dept.complaintCategories || []),
    dept.name,
    dept.sector || '',
  ].map((s) => String(s).toLowerCase());

  let score = 0;
  let matchedTerm = null;
  bag.forEach((term) => {
    if (term && haystack.includes(term)) {
      score += term.length > 5 ? 3 : 1; // longer/more-specific terms count more
      if (!matchedTerm) matchedTerm = term;
    }
  });
  return { score, matchedTerm };
};

const isCorruptionReport = (text) => CORRUPTION_WORDS.some((w) => text.toLowerCase().includes(w));

const detectPriority = (text) => {
  const t = text.toLowerCase();
  if (isCorruptionReport(t)) return 'High';
  if (URGENT_WORDS.some((w) => t.includes(w))) return 'Critical';
  if (HIGH_WORDS.some((w) => t.includes(w))) return 'High';
  if (LOW_WORDS.some((w) => t.includes(w))) return 'Low';
  return 'Medium';
};

const suggestTitle = (text, deptName, corruption) => {
  if (corruption) {
    return deptName ? `Corruption complaint against ${deptName} official` : 'Corruption / bribery complaint';
  }
  const trimmed = text.trim().replace(/\s+/g, ' ');
  const words = trimmed.split(' ');
  const short = words.slice(0, 9).join(' ');
  return short.charAt(0).toUpperCase() + short.slice(1) + (words.length > 9 ? '…' : '');
};

const ruleBasedSuggest = async (description) => {
  const departments = await Department.find({ isActive: true });
  const categories = await Category.find({ isActive: true });

  const scored = departments
    .map((d) => ({ dept: d, ...scoreDepartment(description, d) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const confidence = !top || top.score === 0 ? 'Low' : top.score >= 6 ? 'High' : 'Medium';
  const corruption = isCorruptionReport(description);

  const text = description.toLowerCase();
  let matchedCategory = corruption ? 'Corruption' : null;
  const categoryPool = top?.dept?.complaintCategories?.length ? top.dept.complaintCategories : categories.map((c) => c.name);
  if (!matchedCategory) {
    categoryPool.forEach((c) => {
      if (!matchedCategory && text.includes(String(c).toLowerCase())) matchedCategory = c;
    });
  }
  if (!matchedCategory) matchedCategory = categoryPool[0] || 'Other';

  const priority = detectPriority(description);
  const title = suggestTitle(description, top?.dept?.name, corruption);

  const missingInfo = [];
  if (!/\b(near|road|street|colony|sector|village|city|area|ward)\b/i.test(description)) {
    missingInfo.push('Exact location (area / landmark / address)');
  }
  if (!/\b(day|week|month|year|since|ago|hour)\b/i.test(description)) {
    missingInfo.push('How long the problem has been happening');
  }
  if (corruption && !/\b(name|officer|employee|manager|clerk|official)\b/i.test(description)) {
    missingInfo.push('Name or designation of the official involved, if known');
  }

  return {
    recommendedDepartment: top?.dept
      ? { _id: top.dept._id, name: top.dept.name, matchedTerm: top.matchedTerm }
      : null,
    confidence,
    recommendedCategory: matchedCategory,
    recommendedPriority: priority,
    suggestedTitle: title,
    suggestedDescription: description.trim(),
    missingInfo,
    poweredBy: 'rules',
  };
};

// @desc  Analyze a free-text problem description and recommend department,
//        category, priority, title and a cleaned-up description. Citizen
//        must still review/edit everything and confirm before submitting —
//        this endpoint never creates a complaint itself. Uses Gemini for a
//        richer read of the text when GOOGLE_API_KEY is configured, and
//        always falls back to the rule-based engine if that's unavailable
//        or its output can't be trusted.
// @route POST /api/ai/suggest
const suggest = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 8) {
      return res.status(400).json({ message: 'Please describe the problem in a bit more detail (at least a sentence).' });
    }

    const ruleResult = await ruleBasedSuggest(description);

    if (isConfigured()) {
      const departments = await Department.find({ isActive: true }).select('name complaintCategories');
      const deptList = departments.map((d) => `${d.name}${d.complaintCategories?.length ? ' (' + d.complaintCategories.join(', ') + ')' : ''}`).join('; ');
      const prompt = `You are a citizen-complaint triage assistant for an Indian government/consumer grievance portal. A citizen wrote this problem description:\n"""${description}"""\n\nAvailable departments: ${deptList}.\n\nRespond with ONLY a compact JSON object (no markdown, no explanation) with these exact keys: department (the closest matching department name from the list, or null), category (a short complaint category, use "Corruption" if this describes a bribe or official demanding money), priority (one of Low, Medium, High, Critical — use High or Critical for corruption, safety or urgent issues), title (a short 6-10 word complaint title), missingInfo (an array of up to 2 short strings naming useful details the citizen didn't mention, e.g. location or how long).`;

      const raw = await callGemini(prompt);
      if (raw) {
        try {
          const cleaned = raw.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleaned);
          const matchedDept = departments.find((d) => d.name.toLowerCase() === String(parsed.department || '').toLowerCase());
          return res.json({
            recommendedDepartment: matchedDept ? { _id: matchedDept._id, name: matchedDept.name, matchedTerm: null } : ruleResult.recommendedDepartment,
            confidence: matchedDept ? 'High' : ruleResult.confidence,
            recommendedCategory: parsed.category || ruleResult.recommendedCategory,
            recommendedPriority: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.priority) ? parsed.priority : ruleResult.recommendedPriority,
            suggestedTitle: parsed.title || ruleResult.suggestedTitle,
            suggestedDescription: description.trim(),
            missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo.slice(0, 3) : ruleResult.missingInfo,
            disclaimer: 'AI suggestions are recommendations only. Please verify the department, category and details before submitting your complaint.',
            poweredBy: 'gemini',
          });
        } catch (parseErr) {
          console.error('Could not parse Gemini JSON, falling back to rules:', parseErr.message);
        }
      }
    }

    res.json({
      ...ruleResult,
      disclaimer: 'AI suggestions are recommendations only. Please verify the department, category and details before submitting your complaint.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Lightweight conversational "Need Help?" assistant. Uses Gemini when
//        configured for a natural reply grounded in the real department
//        list; otherwise a rule-based reply. Explicitly never claims to be a
//        government officer or to have taken any action on the citizen's behalf.
// @route POST /api/ai/chat
const chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'message is required' });
    const text = message.toLowerCase();
    const note = 'This is an automated assistant, not a government officer, and cannot take official action. For an official response, please submit or track a complaint, or use the Official Helpline.';

    if (isConfigured()) {
      const departments = await Department.find({ isActive: true }).select('name complaintCategories');
      const deptList = departments.map((d) => d.name).join(', ');
      const prompt = `You are "Need Help?", a friendly assistant on an Indian citizen-complaint portal called NCCMS. You are NOT a government officer and must never claim to be one or claim you've taken official action. A citizen asks: "${message}". Available departments on this portal: ${deptList}. In 2-4 short sentences: explain what kind of issue this sounds like, name the single most relevant department from the list if one applies, and briefly guide them on what to do next on the portal (e.g. use the AI Complaint Assistant to auto-fill a complaint, or submit one directly). Be concise and plain, no markdown.`;
      const reply = await callGemini(prompt);
      if (reply) return res.json({ reply: reply.trim(), note, poweredBy: 'gemini' });
    }

    let reply;
    if (isCorruptionReport(text)) {
      reply = 'That sounds like a corruption/bribery report — this should be filed as a "Corruption" category complaint against the relevant department, and it will be marked High priority. Please include the official\'s name/designation and what was demanded, if you know it.';
    } else if (/\bstatus\b|\btrack\b/.test(text)) {
      reply = 'You can check your complaint\'s progress any time from "Track Complaint" using your Complaint ID, or from your dashboard under "My Complaints".';
    } else if (/\bdocument|proof|attach/.test(text)) {
      reply = 'When you submit a complaint you can attach photos or documents as evidence — this helps the assigned officer resolve it faster. It isn\'t mandatory, but it helps.';
    } else if (/\bhow long|time|sla|deadline/.test(text)) {
      reply = 'Resolution time depends on the department and the priority of your complaint (Critical complaints are prioritized). You can see the current status any time on the tracking page.';
    } else {
      const departments = await Department.find({ isActive: true });
      const scored = departments.map((d) => scoreDepartment(text, d)).map((s, i) => ({ ...s, dept: departments[i] }));
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      if (best && best.score > 0) {
        reply = `This sounds like something for the ${best.dept.name} department. I'd suggest using the AI Complaint Assistant to auto-fill a complaint, or you can submit one directly and select "${best.dept.name}".`;
      } else {
        reply = 'I can help point you to the right department and prepare a complaint — could you share a few more details about the problem (what happened, where, and since when)?';
      }
    }

    res.json({ reply, note, poweredBy: 'rules' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { suggest, chat };
