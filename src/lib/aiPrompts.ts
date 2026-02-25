import { AiUnavailableError, callAiText } from "@/lib/ai/router";

export type TargetType = "MP" | "MLA" | "DEPT";

export type GenerateRtiDraftParams = {
  question: string;
  userName?: string;
  userAddress?: string;
  userEmail?: string;
  targetType: TargetType;
  targetName?: string;
  targetConstituency?: string;
  stateName: string;
  stateCode?: string;
};

export type RtiDraftModelResult = {
  rti_text: string;
  pio_name: string | null;
  pio_address: string | null;
  filing_instructions: string[];
  safe: boolean;
  safety_reason?: string;
};

export type AnalyzeComplaintParams = {
  photoUrl: string;
  locationText: string;
  stateName: string;
  stateCode?: string;
};

export type ComplaintAnalysisModelResult = {
  issue_type: string;
  severity: "low" | "medium" | "high";
  department_name: string;
  title: string;
  description: string;
  needs_additional_info: boolean;
  additional_fields: string[];
  safe: boolean;
  safety_reason?: string;
};

class AiJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiJsonError";
  }
}

function ensureString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

function ensureNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  return null;
}

function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return [];
}

function normalizeSeverity(value: unknown): "low" | "medium" | "high" {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  const text = typeof value === "string" ? value.toLowerCase() : "";
  if (text === "low" || text === "high") {
    return text;
  }
  return "medium";
}

function detectUnsafeText(input: string): { safe: boolean; reason?: string } {
  const text = input.toLowerCase();
  const selfHarmPhrases = ["kill myself", "hurt myself", "end my life", "suicide"];
  const violentPhrases = ["kill them", "murder", "bomb", "terrorist"];

  for (const phrase of selfHarmPhrases) {
    if (text.includes(phrase)) {
      return {
        safe: false,
        reason: "Request appears to involve self-harm."
      };
    }
  }

  for (const phrase of violentPhrases) {
    if (text.includes(phrase)) {
      return {
        safe: false,
        reason: "Request appears to encourage violence."
      };
    }
  }

  return { safe: true };
}

type StatePromptConfig = {
  code: string;
  displayName: string;
  rtiPioLabel: string;
  complaintCityLabel: string;
  complaintDepartmentsSummary: string;
};

const STATE_PROMPT_CONFIGS: StatePromptConfig[] = [
  {
    code: "DL",
    displayName: "Delhi",
    rtiPioLabel: "Public Information Officer, Government of NCT of Delhi",
    complaintCityLabel: "Delhi",
    complaintDepartmentsSummary:
      "Typical departments you can choose from include: the Municipal Corporation (for local roads, garbage, drains, and streetlights), the Delhi Jal Board (for water supply issues), power distribution companies (for electricity supply issues), and the Public Works Department (PWD) for major roads and public works."
  },
  {
    code: "MH",
    displayName: "Maharashtra",
    rtiPioLabel: "Public Information Officer, Government of Maharashtra",
    complaintCityLabel: "Mumbai",
    complaintDepartmentsSummary:
      "Typical departments you can choose from include: the Municipal Corporation (for local roads, garbage, drains, and streetlights), the water supply department or Jal Board (for water issues), electricity distribution companies (for power supply issues), and the Public Works Department (PWD) for major roads and public works. Use the most relevant department based on the location in Maharashtra."
  }
];

function getStatePromptConfig(input: { stateCode?: string; stateName?: string }): StatePromptConfig {
  const code = input.stateCode?.toUpperCase().trim();
  const nameRaw = input.stateName?.trim();

  if (code) {
    const byCode = STATE_PROMPT_CONFIGS.find((cfg) => cfg.code === code);
    if (byCode) {
      return byCode;
    }
  }

  if (nameRaw) {
    const nameLower = nameRaw.toLowerCase();
    const byName = STATE_PROMPT_CONFIGS.find(
      (cfg) => cfg.displayName.toLowerCase() === nameLower
    );
    if (byName) {
      return byName;
    }
  }

  const displayName = nameRaw && nameRaw.length > 0 ? nameRaw : "the state";

  return {
    code: code ?? "XX",
    displayName,
    rtiPioLabel: `Public Information Officer, Government of ${displayName}`,
    complaintCityLabel: displayName,
    complaintDepartmentsSummary:
      "Typical departments you can choose from include the municipal corporation (for local roads, garbage, drains, and streetlights), the state water board (for water supply issues), the relevant electricity distribution company (for power supply issues), and the Public Works Department (for major roads and public works)."
  };
}

export async function generateRtiDraft(
  params: GenerateRtiDraftParams
): Promise<RtiDraftModelResult> {
  const {
    question,
    userName,
    userAddress,
    userEmail,
    targetType,
    targetName,
    targetConstituency,
    stateName,
    stateCode
  } = params;

  const stateConfig = getStatePromptConfig({ stateCode, stateName });
  const stateDisplay = stateConfig.displayName;

  const trimmedQuestion = question.trim();

  const safetyCheck = detectUnsafeText(trimmedQuestion);

  const targetLabel =
    targetType === "DEPT"
      ? stateConfig.rtiPioLabel
      : `${targetType} ${targetName ?? ""}${
          targetConstituency ? ` for ${targetConstituency}, ${stateDisplay}` : `, ${stateDisplay}`
        }`.trim();

  const systemLines: string[] = [];
  systemLines.push("You are an expert assistant for drafting Right to Information applications.");
  systemLines.push(`You are working for citizens in ${stateDisplay}, India.`);
  systemLines.push(
    "Each response must be a single JSON object and must strictly match the required type."
  );
  systemLines.push(
    "This is an RTI under the Right to Information Act 2005, Section 6(1). Mention this explicitly."
  );
  systemLines.push(
    "Assume the normal statutory response deadline is 30 days for the Public Information Officer (PIO) and mention this."
  );
  systemLines.push(
    "Do not invent or hallucinate legal provisions beyond the RTI Act 2005 and Section 6(1)."
  );
  systemLines.push(
    "If the specific PIO name or exact postal address is not known, set pio_name and pio_address to null."
  );
  systemLines.push(
    "Write one concise RTI in formal Indian English, polite and respectful but firm."
  );
  systemLines.push(
    "Address the application generically to the Public Information Officer, without inventing personal names."
  );
  systemLines.push(
    "Mention that the application fee will be paid as per applicable rules, but do not describe payment modes or amounts."
  );
  systemLines.push(
    `For DEPT targets, assume the addressee is ${stateConfig.rtiPioLabel}.`
  );
  systemLines.push(
    "For MP or MLA targets, you are drafting an RTI that is relevant to their constituency and role, but still addressed to the appropriate PIO."
  );
  systemLines.push(
    "Your entire response must be valid JSON, with no leading or trailing commentary, markdown, or explanations."
  );
  systemLines.push("The JSON type you must output is:");
  systemLines.push("{");
  systemLines.push('  "rti_text": "full RTI body...",');
  systemLines.push('  "pio_name": "string or null",');
  systemLines.push('  "pio_address": "string or null",');
  systemLines.push('  "filing_instructions": [');
  systemLines.push('    "step 1 text...",');
  systemLines.push('    "step 2 text..."');
  systemLines.push("  ],");
  systemLines.push('  "safe": boolean,');
  systemLines.push('  "safety_reason": "string or null"');
  systemLines.push("}");
  systemLines.push(
    "Respond ONLY with JSON, no extra text, matching this type exactly. Do not wrap the JSON in code fences."
  );
  if (!safetyCheck.safe) {
    systemLines.push(
      "If the user request is abusive, hateful, or self-harm related, refuse to draft content and instead respond with a JSON error that explains why you cannot comply. In that case, set safe to false and safety_reason to a short explanation."
    );
  }

  const userLines: string[] = [];
  userLines.push("User context for this RTI application:");
  userLines.push(`State: ${stateDisplay}`);
  userLines.push(`Target type: ${targetType}`);
  userLines.push(`Target description: ${targetLabel}`);
  userLines.push(
    `Citizen name: ${userName && userName.trim().length > 0 ? userName.trim() : "Not provided"}`
  );
  userLines.push(
    `Citizen address: ${
      userAddress && userAddress.trim().length > 0 ? userAddress.trim() : "Not provided"
    }`
  );
  userLines.push(
    `Citizen email: ${
      userEmail && userEmail.trim().length > 0 ? userEmail.trim() : "Not provided"
    }`
  );
  userLines.push("RTI question or information sought:");
  userLines.push(trimmedQuestion);

  const prompt = ["SYSTEM PROMPT:", ...systemLines, "", "USER INPUT:", ...userLines].join("\n");

  let raw: string;

  try {
    const response = await callAiText({
      prompt,
      temperature: 0.2,
      maxTokens: 2048
    });
    raw = response.text;
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      throw new AiJsonError("AI drafting disabled");
    }
    throw error;
  }
  const trimmed = raw.trim();

  if (!trimmed.startsWith("{")) {
    console.error("AI RTI draft did not start with JSON object", trimmed.slice(0, 200));
    throw new AiJsonError("AI response was not JSON");
  }

  let parsed: any;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    console.error("Failed to parse RTI JSON", error, trimmed.slice(0, 500));
    throw new AiJsonError("AI response JSON could not be parsed");
  }

  const rtiText = ensureString(parsed.rti_text);
  const pioName = ensureNullableString(parsed.pio_name);
  const pioAddress = ensureNullableString(parsed.pio_address);
  const filingInstructions = ensureStringArray(parsed.filing_instructions);

  if (!rtiText.trim()) {
    throw new AiJsonError("AI response missing RTI text");
  }

  return {
    rti_text: rtiText,
    pio_name: pioName,
    pio_address: pioAddress,
    filing_instructions: filingInstructions,
    safe: typeof parsed.safe === "boolean" ? parsed.safe : true,
    safety_reason:
      typeof parsed.safety_reason === "string" && parsed.safety_reason.trim().length > 0
        ? parsed.safety_reason
        : undefined
  };
}

export async function analyzeComplaint(
  params: AnalyzeComplaintParams
): Promise<ComplaintAnalysisModelResult> {
  const { photoUrl, locationText, stateName, stateCode } = params;

  const stateConfig = getStatePromptConfig({ stateCode, stateName });
  const stateDisplay = stateConfig.complaintCityLabel;

  const systemLines: string[] = [];
  systemLines.push("You are assisting with civic complaints for an Indian city.");
  systemLines.push(
    `Assume the state is ${stateConfig.displayName}, and focus on civic issues within this state.`
  );
  systemLines.push(
    "Your task is to classify the issue and draft a short, formal complaint email body."
  );
  systemLines.push(
    "Output must be a single JSON object with a strict shape and no extra commentary."
  );
  systemLines.push("This tool is only for public civic issues, not private disputes.");
  systemLines.push(
    "Prefer assigning issues to well-known public bodies, not obscure or rarely used entities."
  );
  systemLines.push("The JSON type you must output is:");
  systemLines.push("{");
  systemLines.push('  "issue_type": "short label",');
  systemLines.push('  "severity": "low" | "medium" | "high",');
  systemLines.push('  "department_name": "string",');
  systemLines.push('  "title": "short subject line",');
  systemLines.push('  "description": "formal complaint body",');
  systemLines.push('  "needs_additional_info": boolean,');
  systemLines.push('  "additional_fields": ["string", "string"],');
  systemLines.push('  "safe": boolean,');
  systemLines.push('  "safety_reason": "string or null"');
  systemLines.push("}");
  systemLines.push(
    "Respond ONLY with JSON, no extra text, matching this type exactly. Do not wrap the JSON in code fences."
  );
  const safetyCheck = detectUnsafeText(locationText);
  if (!safetyCheck.safe) {
    systemLines.push(
      "If the user request is abusive, hateful, or self-harm related, refuse to draft content and instead respond with a JSON error that explains why you cannot comply. In that case, set safe to false and safety_reason to a short explanation."
    );
  }

  const userLines: string[] = [];
  userLines.push(`This is for ${stateDisplay} civic complaints.`);
  userLines.push(
    `You receive a photo URL and a short free-text location within ${stateDisplay}.`
  );
  userLines.push(
    "Treat the photo as evidence of the issue, even though you only see its URL here."
  );
  userLines.push(stateConfig.complaintDepartmentsSummary);
  userLines.push(
    "Pick the single most appropriate department_name from these or a close generic variant, and do not invent obscure authorities."
  );
  userLines.push(
    "Use a neutral but firm citizen tone, clearly mentioning the location and describing the problem."
  );
  userLines.push(
    "Ask for a specific action and reasonable timeframe for resolution in the description."
  );
  userLines.push(
    "Set needs_additional_info to true only when the situation truly requires more private details, such as disputes on private property boundaries."
  );
  userLines.push(`Photo URL: ${photoUrl}`);
  userLines.push(`Location text (${stateDisplay}): ${locationText}`);

  const prompt = ["SYSTEM PROMPT:", ...systemLines, "", "USER INPUT:", ...userLines].join("\n");

  let raw: string;

  try {
    const response = await callAiText({
      prompt,
      imageUrl: photoUrl,
      temperature: 0.2,
      maxTokens: 2048
    });
    raw = response.text;
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      throw new AiJsonError("AI suggestion disabled");
    }
    throw error;
  }
  const trimmed = raw.trim();

  if (!trimmed.startsWith("{")) {
    console.error("AI complaint analysis did not start with JSON object", trimmed.slice(0, 200));
    throw new AiJsonError("AI response was not JSON");
  }

  let parsed: any;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    console.error("Failed to parse complaint JSON", error, trimmed.slice(0, 500));
    throw new AiJsonError("AI response JSON could not be parsed");
  }

  const issueType = ensureString(parsed.issue_type);
  const severity = normalizeSeverity(parsed.severity);
  const departmentName = ensureString(parsed.department_name);
  const title = ensureString(parsed.title);
  const description = ensureString(parsed.description);
  const needsAdditionalInfo =
    typeof parsed.needs_additional_info === "boolean" ? parsed.needs_additional_info : false;
  const additionalFields = ensureStringArray(parsed.additional_fields);

  if (!issueType.trim() || !title.trim() || !description.trim() || !departmentName.trim()) {
    throw new AiJsonError("AI response missing required complaint fields");
  }

  return {
    issue_type: issueType,
    severity,
    department_name: departmentName,
    title,
    description,
    needs_additional_info: needsAdditionalInfo,
    additional_fields: additionalFields,
    safe: typeof parsed.safe === "boolean" ? parsed.safe : true,
    safety_reason:
      typeof parsed.safety_reason === "string" && parsed.safety_reason.trim().length > 0
        ? parsed.safety_reason
        : undefined
  };
}

export { AiJsonError };

