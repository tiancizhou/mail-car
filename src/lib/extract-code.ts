export interface ExtractedCode {
  code: string;
  source: string;
}

// Ignore markup and non-visible content before looking for a code.
function visibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(x[\da-f]+|\d+);/gi, (entity, value: string) => {
      const point = value[0].toLowerCase() === "x"
        ? parseInt(value.slice(1), 16) : parseInt(value, 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/&(?:nbsp|ensp|emsp);/gi, " ")
    .replace(/&colon;/gi, ":");
}

export function extractVerificationCodes(html: string, text: string): ExtractedCode[] {
  const results: ExtractedCode[] = [];
  const seen = new Set<string>();
  const contents = [visibleText(html), text];

  const add = (code: string, source: string) => {
    // Reject ordinary English words; accept numeric and mixed alphanumeric codes.
    if (/^[a-zA-Z0-9]{4,8}$/.test(code) && /\d/.test(code) && !seen.has(code)) {
      seen.add(code);
      results.push({ code, source });
    }
  };

  // Capture only the token, never the label. Do not truncate longer identifiers.
  const label = /(?:验证码|校验码|(?:临时\s*)?代码|\b(?:verification\s+code|verify[\s-]*code|your\s+code|login\s+code|temporary\s+code|security\s+code|one[ -]time\s+(?:code|password)|OTP|PIN|passcode|code)\b)\s*(?:(?:is\b|为|是)\s*)?[：:=\-]?\s*([a-zA-Z0-9]{4,8})(?![a-zA-Z0-9_])/gi;
  for (const content of contents) {
    for (const match of content.matchAll(label)) add(match[1], "验证码提取");
  }

  const cleanHtml = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const htmlPatterns = [
    /style=["'][^"']*(?:font-size:\s*(?:2[4-9]|[3-4]\d|5[0-6])px|letter-spacing)[^"']*["'][^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
    /<(?:code|pre)\b[^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
    /class=["'][^"']*\b(?:code|otp|verification|pin)\b[^"']*["'][^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
  ];
  for (const regex of htmlPatterns) {
    for (const match of cleanHtml.matchAll(regex)) add(match[1], "HTML提取");
  }

  if (results.length === 0) {
    for (const content of contents) {
      for (const match of content.matchAll(/(?:^|\s)(\d{4,8})(?=\s|$|[，。,.!！;；])/g)) {
        add(match[1], "数字匹配");
      }
    }
  }
  return results;
}
