/**
 * Turathna Chatbot Controller
 * Dual-API (Gemini primary → Groq fallback) with Circuit Breaker + MongoDB Function Calling
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk");
const Product = require("../models/productModel");
const Workshop = require("../models/workshopModel");

// ─────────────────────────────────────────────
// 1. CLIENT INITIALIZATION
// ─────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────
// 2. CIRCUIT BREAKER
// ─────────────────────────────────────────────
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;

    this.failureThreshold = options.failureThreshold ?? 3;
    this.recoveryTimeout = options.recoveryTimeout ?? 30000;
    this.halfOpenSuccesses = options.halfOpenSuccesses ?? 2;
  }

  allowRequest() {
    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.recoveryTimeout) {
        console.log(
          `[CircuitBreaker:${this.name}] → HALF_OPEN (testing recovery)`,
        );
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    if (this.state === "HALF_OPEN") return true;
    return false;
  }

  recordSuccess() {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccesses) {
        console.log(`[CircuitBreaker:${this.name}] → CLOSED (recovered)`);
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.failureThreshold
    ) {
      console.warn(
        `[CircuitBreaker:${this.name}] → OPEN (failures: ${this.failureCount})`,
      );
      this.state = "OPEN";
    }
  }

  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  get isOpen() {
    return this.state === "OPEN";
  }
}

const geminiBreaker = new CircuitBreaker("Gemini", {
  failureThreshold: 3,
  recoveryTimeout: 30000,
});
const groqBreaker = new CircuitBreaker("Groq", {
  failureThreshold: 3,
  recoveryTimeout: 60000,
});

// ─────────────────────────────────────────────
// 3. DATA MASKING — PUBLIC FIELDS ONLY
// ─────────────────────────────────────────────
const PRODUCT_PUBLIC_FIELDS = {
  title_ar: 1,
  title_en: 1,
  description_ar: 1,
  description_en: 1,
  heritage_text: 1,
  finalPrice: 1,
  _id: 1,
};

const WORKSHOP_PUBLIC_FIELDS = {
  title_ar: 1,
  title_en: 1,
  description_ar: 1,
  description_en: 1,
  date: 1,
  time: 1,
  seats: 1,
  workshopAddress: 1,
  workshopLink: 1,
  workshopOffline: 1,
  workshopOnline: 1,
  finalPrice: 1,
  _id: 1,
};

// ─────────────────────────────────────────────
// 4. QUERY EXPANSION — Fuzzy synonym chaining
//    Expands a misspelled/partial query into all
//    related terms before sending to Atlas Search.
// ─────────────────────────────────────────────
function expandQuery(query) {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // strip diacritics
    .replace(/[أإآ]/g, "ا")
    .replace(/ة$/, "ه");

  const SYNONYM_CLUSTERS = [
    ["فخار", "خزف", "طمي", "pottery", "ceramics"],
    ["نسيج", "نسج", "حياكة", "weaving"],
    ["قلادة", "عقد", "necklace"],
    ["سوار", "أسورة", "bracelet"],
    ["خاتم", "خواتم", "ring"],
    ["حلق", "أقراط", "earring"],
    ["سجادة", "سجاد", "rug", "carpet"],
    ["تطريز", "مطرز", "embroidery"],
    ["سلة", "سلال", "basket"],
    ["خشب", "نجارة", "woodwork", "wood"],
    ["جلد", "جلود", "leather"],
    ["زجاج", "خرز", "beads", "glass"],
    ["مجوهرات", "اكسسوار", "jewelry", "jewellery", "accessories"],
    ["فرعوني", "فرعونية", "pharaonic", "ancient egyptian"],
    ["نوبي", "نوبية", "nubian"],
    ["إسلامي", "إسلامية", "islamic"],
    ["سيناء", "sinai"],
    ["سيوة", "siwa"],
    ["يدوي", "يدوية", "handmade"],
    ["ورشة", "ورش", "workshop", "workshops"],
    ["اسوان", "aswan", "aswani", "أسواني"],
    ["القاهرة", "cairo"],
    ["الاسكندرية", "alexandria"],
    ["الاقصر", "luxor"],
    ["سيناء", "sinai"],
    ["سيوة", "siwa"],
    ["النوبة", "nubia", "nubian", "نوبي", "نوبية"],
  ];

  // Levenshtein edit distance
  function editDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) =>
        i === 0 ? j : j === 0 ? i : 0,
      ),
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[a.length][b.length];
  }

  const MIN_WORD_LENGTH_FOR_FUZZY = 4;
  const words = normalized.split(/\s+/);
  const expandedTerms = new Set(words); // always include original words

  for (const word of words) {
    for (const cluster of SYNONYM_CLUSTERS) {
      // If any cluster term is within edit distance 2, expand to full cluster
      const hit = cluster.find((term) => {
        const t = term.toLowerCase();
        if (
          word.length <= MIN_WORD_LENGTH_FOR_FUZZY ||
          t.length <= MIN_WORD_LENGTH_FOR_FUZZY
        ) {
          return word === t; // exact match only for short words
        }
        return editDistance(word, t) <= 2;
      });
      if (hit) {
        cluster.forEach((t) => expandedTerms.add(t));
        break;
      }
    }
  }

  return [...expandedTerms].join(" ");
}

// ─────────────────────────────────────────────
// 5. SEARCH CATALOG — TOOL IMPLEMENTATION
// ─────────────────────────────────────────────
async function searchCatalog(query, type) {
  try {
    const expandedQuery = expandQuery(query);
    console.log(`[searchCatalog] expanded: "${query}" → "${expandedQuery}"`);

    const collection = type === "products" ? Product : Workshop;
    const indexName =
      type === "products" ? "products_search_index" : "workshops_search_index";

    console.log(
      `[searchCatalog] CALLED with query="${query}" type="${type}" index="${indexName}"`,
    );

    const searchFields =
      type === "products"
        ? [
            "title_ar",
            "title_en",
            "description_ar",
            "description_en",
            "heritage_text",
          ]
        : ["title_ar", "title_en", "description_ar", "description_en"];

    const pipeline = [
      {
        $search: {
          index: indexName,
          compound: {
            should: [
              {
                // Arabic Fields
                text: {
                  query: expandedQuery,
                  path: searchFields,
                  fuzzy: { maxEdits: 2, prefixLength: 1, maxExpansions: 50 },
                  //synonyms: "all_synonyms",
                },
              },
              {
                // English Fields
                text: {
                  query: expandedQuery,
                  path: ["title_en", "description_en"],
                  synonyms: "all_synonyms",
                },
              },
            ],
            filter: [
              {
                equals: {
                  path: "verificationStatus",
                  value: "approved",
                },
              },
            ],
            minimumShouldMatch: 1,
          },
        },
      },
      {
        $addFields: { score: { $meta: "searchScore" } },
      },
      {
        $match: { score: { $gte: 0.5 } }, // filter out weak fuzzy matches
      },
    ];

    if (type === "products") {
      pipeline.push({
        $lookup: {
          from: "regions",
          localField: "region",
          foreignField: "_id",
          as: "region",
        },
      });
      pipeline.push({
        $unwind: { path: "$region", preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $project: {
          ...PRODUCT_PUBLIC_FIELDS,
          "region.name": 1,
          "region.slugName": 1,
        },
      });
    } else {
      pipeline.push({ $project: WORKSHOP_PUBLIC_FIELDS });
    }

    pipeline.push({ $limit: 5 });

    const results = await collection.aggregate(pipeline);

    console.log(`[searchCatalog] RAW RESULTS COUNT: ${results.length}`);
    if (results.length > 0) {
      console.log(
        `[searchCatalog] FIRST RESULT:`,
        JSON.stringify(results[0], null, 2),
      );
    }

    if (!results || results.length === 0) return "No results found.";

    console.log(
      `[searchCatalog] query="${query}" type=${type} hits=${results.length}`,
    );

    return type === "products"
      ? formatProductResults(results)
      : formatWorkshopResults(results);
  } catch (err) {
    console.error("[Atlas Search Error]:", err.message);
    return "Error fetching data.";
  }
}

// ─────────────────────────────────────────────
// 6. RESULT FORMATTERS
// ─────────────────────────────────────────────
function formatProductResults(products) {
  return products
    .map((p, i) => {
      const lines = [`[Product ${i + 1}]`];
      lines.push(`Name: ${p.title_ar || ""} / ${p.title_en || ""}`);
      lines.push(
        `Description: ${p.description_ar || ""} / ${p.description_en || ""}`,
      );
      if (p.heritage_text) lines.push(`Heritage: ${p.heritage_text}`);
      if (p.region) {
        const regionName = p.region.name || p.region.slugName || "Egypt";
        lines.push(`Region: ${regionName}`);
      }
      if (p.finalPrice != null) lines.push(`Price: ${p.finalPrice} EGP`);
      if (p._id) {
        const base = process.env.FRONTEND_URL || "http://localhost:5173";
        const url = `${base}/details/${p._id}`;
        if (!url.includes("undefined")) lines.push(`Product Link: ${url}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function formatWorkshopResults(workshops) {
  return workshops
    .map((w, i) => {
      const lines = [`[Workshop ${i + 1}]`];
      lines.push(`Title: ${w.title_ar || ""} / ${w.title_en || ""}`);
      lines.push(
        `Description: ${w.description_ar || ""} / ${w.description_en || ""}`,
      );
      if (w.finalPrice != null) lines.push(`Price: ${w.finalPrice} EGP`);
      if (w.date)
        lines.push(`Date: ${new Date(w.date).toLocaleDateString("ar-EG")}`);
      if (w.time) lines.push(`Time: ${w.time}`);
      if (w.seats != null) lines.push(`Available Seats: ${w.seats}`);
      lines.push(`Type: ${w.workshopOnline ? "Online" : "Offline"}`);
      if (w.workshopAddress) lines.push(`Location: ${w.workshopAddress}`);
      if (w._id) {
        const base = process.env.FRONTEND_URL || "http://localhost:5173";
        const url = `${base}/workshop/${w._id}`;
        if (!url.includes("undefined")) lines.push(`Booking Link: ${url}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

// ─────────────────────────────────────────────
// 7. TOOL SCHEMAS
// ─────────────────────────────────────────────
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchCatalog",
        description:
          "Search Turathna's catalog of approved Egyptian handicraft products or cultural workshops. Use this whenever the user asks about specific items, regions, prices, or events.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "Search keywords (e.g. 'pottery', 'Siwa', 'weaving workshop')",
            },
            type: {
              type: "STRING",
              enum: ["products", "workshops"],
              description: "Whether to search products or workshops",
            },
          },
          required: ["query", "type"],
        },
      },
    ],
  },
];

const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "searchCatalog",
      description:
        "Search Turathna's catalog of approved Egyptian handicraft products or cultural workshops. Use this whenever the user asks about specific items, regions, prices, or events.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search keywords (e.g. 'pottery', 'Siwa', 'weaving workshop')",
          },
          type: {
            type: "string",
            enum: ["products", "workshops"],
            description: "Whether to search products or workshops",
          },
        },
        required: ["query", "type"],
      },
    },
  },
];

// ─────────────────────────────────────────────
// 8. SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Turathna Assistant — a helpful, friendly guide for the Turathna platform, which celebrates Egyptian heritage handicrafts and cultural workshops.

Your responsibilities:
- Help users discover authentic Egyptian products (pottery, weaving, jewelry, etc.) and workshops.
- Answer questions about product details, prices, availability, and workshop schedules.
- Use the 'searchCatalog' tool whenever a user asks about specific products, categories, regions, or workshops.
- ONLY share information about "approved" items (the database already filters this, but never invent or assume details).
- When searching, extract only the core subject (e.g., 'pottery', 'weaving') and avoid generic words like 'current' or 'available' to ensure better database matching.

MANDATORY TOOL USE — THIS IS THE MOST IMPORTANT RULE:
- For greetings or general questions about Turathna (not specific products): answer directly.
- For ANY mention of products, crafts, workshops, prices, regions, availability: 
  YOU MUST call searchCatalog. No exceptions. Never answer these from memory.
- You MUST call the 'searchCatalog' tool for ANY question about products or workshops.
- You are FORBIDDEN from answering product/workshop questions from memory or general knowledge.
- NEVER invent, generate, or assume product names, prices, descriptions, or links.
- If you do not call 'searchCatalog', your response is WRONG regardless of how accurate it seems.
- Do NOT narrate what you are doing (e.g. never write "Searching for..."). Just call the tool silently.
- Search Term Optimization: Always use standard Arabic or English terms for search queries. Avoid transliterations like 'sajjad' or 'fokhar'. Translate user intent to the most formal category name (e.g., 'سجاد' instead of 'sajjad').

Display Rules — FOLLOW THIS EXACT ORDER for every workshop or product returned:
1. Name (Title_AR or Title_EN)
2. Description (a brief summary from the tool result)
3. Price (e.g. "السعر: 200 جنيه")
4. Date and Time (for workshops)
5. Available Seats (for workshops)
6. Location / Type (Online or Offline)
7. Call to Action (Link): This MUST be the last item.
   - For Workshops: Frame it as "يمكنك الحجز من هنا: [Link]" or "Book here: [Link]".
   - For Products: Frame it as "يمكنك الشراء من هنا: [Link]" or "Buy here: [Link]".
   - Use the exact URL provided in the tool result. Never hide the link or say it's invalid if a URL is present.

Validation Rule:
- ONLY display workshops that have a valid future date and at least 1 available seat.
- If the tool's result for a workshop says "Seats: 0" or has a past date, SKIP it entirely and do not mention it to the user.

CRITICAL: 
- You MUST present ALL of the above fields that exist in the tool result. Never skip Name, Price, or Date. Never show ONLY the link.
- Never invent or hallucinate products, prices, or links. If the 'searchCatalog' tool returns no results, you MUST use the Professional Fallback message and NOT display any products.
- If the search tool returns 'No results', but provides 'Suggestions', tell the user: 'I couldn't find exactly what you asked for, but did you mean [Suggestion]?' and show data based on the closest items.

Professional Fallback:
- If NO results are found, respond professionally:
  Arabic: "عذراً، لم أجد نتائج تطابق بحثك حالياً. هل تود استكشاف حرفة أخرى مثل النسيج أو الفخار؟"
  English: "I couldn't find any results matching your search. Would you like to explore other crafts like weaving or pottery?"

Language Detection — CRITICAL:
- Detect language from the user's message script and vocabulary.
- If the user writes in English (Latin characters), your ENTIRE response must be in English, including all labels, field names, and descriptions.
- If the user writes in Arabic (Arabic script), your ENTIRE response must be in Arabic.
- A user writing in English who asks about Arabic topics still gets an English response.
- NEVER switch languages mid-response.

Language rule:
- STRICT SELECTION RULE: When the tool returns data in both Arabic and English (e.g., 'Name: قلادة / necklace'), select ONLY the version matching the user's language.
  - Arabic user → show Arabic only.
  - English user → show English only.
  - NEVER mix both languages in one response.
- Arabic responses: no Cyrillic, Chinese, or non-Arabic characters (except links/IDs).
- English responses: use title_en and description_en, English labels only.

Tone: Warm, culturally respectful, concise. You may mention the rich history behind crafts when relevant.

Restrictions:
- Never reveal seller IDs, rejection messages, or internal platform data.
- If the tool's output contains "undefined" in a link, do not show the link.`;

// ─────────────────────────────────────────────
// 9. GEMINI STREAMING  (with per-request retries)
//    Each "failure" recorded on the circuit breaker
//    represents MAX_RETRIES+1 real attempts, so the
//    threshold-3 breaker only opens after 9 true fails.
// ─────────────────────────────────────────────
async function callGeminiStream(messages, res) {
  if (!geminiBreaker.allowRequest()) {
    throw new Error("CIRCUIT_OPEN: Gemini circuit breaker is open");
  }

  const MAX_RETRIES = 2; // 3 total attempts per request
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
        tools: GEMINI_TOOLS,
        toolConfig: {
          functionCallingConfig: { mode: "AUTO" },
        },
      });

      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          {
            text:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          },
        ],
      }));

      const chat = model.startChat({ history });
      const lastMessage = messages[messages.length - 1].content;

      // Step 1: kick off stream
      const result = await chat.sendMessageStream(lastMessage);

      // Step 2: wait for full aggregated response to check for function calls
      const aggregated = await result.response;
      const calls = aggregated.functionCalls
        ? aggregated.functionCalls()
        : null;

      if (calls && calls.length > 0) {
        // Step 3a: execute tool calls, then stream the follow-up
        const toolResults = [];
        for (const call of calls) {
          if (call.name === "searchCatalog") {
            const { query, type } = call.args;
            console.log(
              `[Gemini] Tool call: searchCatalog("${query}", "${type}")`,
            );
            const data = await searchCatalog(query, type);
            toolResults.push({
              functionResponse: { name: call.name, response: { result: data } },
            });
          }
        }
        const secondResult = await chat.sendMessageStream(toolResults);
        for await (const chunk of secondResult.stream) {
          const text = chunk.text();
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      } else {
        // Step 3b: no tool calls — stream original result
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      // Success — reset breaker and return
      geminiBreaker.recordSuccess();
      return;
    } catch (err) {
      lastError = err;

      const isRetryable =
        err.status === 429 ||
        err.status >= 500 ||
        err.message?.includes("quota");

      // Non-retryable errors (e.g. 400 bad request) — fail immediately
      if (!isRetryable) throw err;

      if (attempt <= MAX_RETRIES) {
        const delay = attempt * 1000; // 1s after attempt 1, 2s after attempt 2
        console.warn(
          `[Gemini] Attempt ${attempt} failed (${err.message}), retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted — count as ONE failure on the circuit breaker
  geminiBreaker.recordFailure();
  throw lastError;
}

// ─────────────────────────────────────────────
// 10. GROQ FALLBACK (non-streaming)
// ─────────────────────────────────────────────

// Llama 3.3 sometimes emits malformed tool calls like:
//   <function=searchCatalog {"query": "pottery", "type": "products"}</function>
// This parser handles valid JSON, broken JSON, and that legacy format.
function parseToolArgs(
  rawArgs,
  fallbackQuery = "فخار",
  fallbackType = "products",
) {
  if (!rawArgs) return { query: fallbackQuery, type: fallbackType };

  // Strip legacy <function=name {...}> wrapper
  const legacyMatch = rawArgs.match(
    /<function=\w+\s*({.*?})\s*(?:<\/function>)?$/s,
  );
  const jsonStr = legacyMatch ? legacyMatch[1] : rawArgs;

  try {
    return JSON.parse(jsonStr);
  } catch (_) {}

  // Regex recovery for broken JSON
  console.warn("[Groq] JSON parse failed, recovering:", rawArgs);
  const queryMatch = rawArgs.match(/"query"\s*:\s*"([^"]+)"/);
  const typeMatch = rawArgs.match(/"type"\s*:\s*"([^"]+)"/);
  return {
    query: queryMatch ? queryMatch[1] : fallbackQuery,
    type: typeMatch ? typeMatch[1] : fallbackType,
  };
}

async function callGroq(messages) {
  if (!groqBreaker.allowRequest()) {
    throw new Error("CIRCUIT_OPEN: Groq circuit breaker is open");
  }

  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    let response = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: formattedMessages,
      tools: GROQ_TOOLS,
      tool_choice: { type: "function", function: { name: "searchCatalog" } },
      max_tokens: 2048,
    });

    let message = response.choices[0].message;

    while (message.tool_calls && message.tool_calls.length > 0) {
      formattedMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "searchCatalog") {
          const args = parseToolArgs(toolCall.function.arguments);
          console.log(
            `[Groq] Tool call: searchCatalog("${args.query}", "${args.type}")`,
          );
          const result = await searchCatalog(args.query, args.type);
          formattedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      response = await groqClient.chat.completions.create({
        model: GROQ_MODEL,
        messages: formattedMessages,
        max_tokens: 2048,
      });
      message = response.choices[0].message;
    }

    const text = message.content;
    if (!text) throw new Error("Empty response from Groq");

    groqBreaker.recordSuccess();
    return text;
  } catch (err) {
    // tool_use_failed (400) = Llama generated a malformed function call.
    // This is a model quirk, NOT a provider outage — do not trip the breaker.
    // Retry once without tools so the user still gets a response.
    if (err.status === 400 && err.message?.includes("tool_use_failed")) {
      console.warn("[Groq] tool_use_failed — retrying without tools");
      try {
        const retryResponse = await groqClient.chat.completions.create({
          model: GROQ_MODEL,
          messages: formattedMessages,
          max_tokens: 2048,
        });
        const retryText = retryResponse.choices[0].message.content;
        if (retryText) {
          groqBreaker.recordSuccess();
          return retryText;
        }
      } catch (retryErr) {
        console.error(
          "[Groq] Retry without tools also failed:",
          retryErr.message,
        );
      }
    }

    if (err.status === 429 || (err.status >= 500 && err.status < 600)) {
      groqBreaker.recordFailure();
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
// 11. EXPRESS CONTROLLER
// ─────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }
    const lastMessage = messages[messages.length - 1];
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      !lastMessage.content?.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Last message must be a non-empty user message" });
    }
    if (lastMessage.content.length > 1000) {
      return res.status(400).json({
        error: "Message too long. Please keep it under 1000 characters.",
      });
    }

    // Keep last 5 messages to avoid hitting context limits
    const trimmedMessages = messages.slice(-5);

    // ── SSE headers ─────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Tell the frontend which provider is being used
    const currentProvider = !geminiBreaker.isOpen ? "gemini" : "groq";
    res.write(`data: ${JSON.stringify({ provider: currentProvider })}\n\n`);

    // ── Primary: Gemini Streaming ────────────────────────────────────────
    if (!geminiBreaker.isOpen) {
      try {
        await callGeminiStream(trimmedMessages, res);
        res.write("data: [DONE]\n\n");
        return res.end();
      } catch (err) {
        console.warn(
          `[AI] Gemini failed: ${err.message} — falling back to Groq`,
        );
      }
    } else {
      console.warn("[AI] Gemini circuit OPEN — going straight to Groq");
    }

    // ── Fallback: Groq ───────────────────────────────────────────────────
    if (!groqBreaker.isOpen) {
      try {
        const reply = await callGroq(trimmedMessages);

        // Simulate streaming sentence-by-sentence for better UX
        const sentences = reply.match(/[^.!?\n]+[.!?\n]*/g) || [reply];
        for (const sentence of sentences) {
          res.write(`data: ${JSON.stringify({ text: sentence })}\n\n`);
          await new Promise((r) => setTimeout(r, 25));
        }
        res.write("data: [DONE]\n\n");
        return res.end();
      } catch (err) {
        console.error(`[AI] Groq also failed: ${err.message}`);
      }
    } else {
      console.error("[AI] Groq circuit OPEN — both providers unavailable");
    }

    // ── Total failure ────────────────────────────────────────────────────
    res.write(
      `data: ${JSON.stringify({
        error:
          "All AI providers are currently unavailable. Please try again shortly.",
      })}\n\n`,
    );
    res.end();
  } catch (err) {
    console.error("[chat controller] Unexpected error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "An unexpected error occurred." });
    }
    res.write(
      `data: ${JSON.stringify({ error: "An unexpected error occurred." })}\n\n`,
    );
    res.end();
  }
};

const getStatus = (_req, res) => {
  res.json({
    gemini: {
      state: geminiBreaker.state,
      failureCount: geminiBreaker.failureCount,
    },
    groq: {
      state: groqBreaker.state,
      failureCount: groqBreaker.failureCount,
    },
  });
};

module.exports = { chat, getStatus };
