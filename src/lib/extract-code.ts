export interface ExtractedCode {
  code: string;
  source: string;
}

export function extractVerificationCodes(html: string, text: string): ExtractedCode[] {
  const results: ExtractedCode[] = [];
  const seen = new Set<string>();
  const content = `${html} ${text}`;

  const add = (code: string, source: string) => {
    if (!seen.has(code) && code.length >= 4 && code.length <= 8) {
      seen.add(code);
      results.push({ code, source });
    }
  };

  // 1. Label-then-code patterns (handles various separators)
  const labelPatterns = [
    /验证码[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /校验码[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /verification\s*code[\s：:]*[a-zA-Z0-9]{4,8}/gi,
    /verify[\s-]*code[\s：:]*[a-zA-Z0-9]{4,8}/gi,
    /your\s+code[\s：:]*[a-zA-Z0-9]{4,8}/gi,
    /code\s*(?:is|:)[：\s]*[a-zA-Z0-9]{4,8}/gi,
    /login\s*code[\s：:]*[a-zA-Z0-9]{4,8}/gi,
    /OTP[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /PIN[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /passcode[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /临时.*?代码[：:\s]*[a-zA-Z0-9]{4,8}/gi,
    /temporary.*?code[\s：:]*[a-zA-Z0-9]{4,8}/gi,
  ];

  for (const regex of labelPatterns) {
    for (const match of content.matchAll(regex)) {
      const code = match[0].match(/[a-zA-Z0-9]{4,8}$/)?.[0];
      if (code) add(code, "验证码提取");
    }
  }

  // 2. HTML-specific: code in large/styled font elements (OpenAI style)
  const htmlPatterns = [
    // font-size: 24-48px or letter-spacing in inline styles
    /style="[^"]*font-size:\s*(?:2[4-9]|[3-4]\d|5[0-6])px[^"]*"[^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
    // letter-spacing common in code display
    /style="[^"]*letter-spacing[^"]*"[^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
    // Code in <code> or <pre> tags
    /<(?:code|pre)[^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
    // Explicit code styling classes
    /class="[^"]*(?:code|otp|verification|pin)[^"]*"[^>]*>\s*([A-Za-z0-9]{4,8})\s*</gi,
  ];

  for (const regex of htmlPatterns) {
    for (const match of html.matchAll(regex)) {
      if (match[1]) add(match[1], "HTML提取");
    }
  }

  // 3. Standalone numbers in prominent positions (as last resort)
  // Look for numbers that appear between HTML tags with significant whitespace
  if (results.length === 0) {
    const standalonePatterns = [
      />\s*(\d{6})\s*</g,
      />\s*(\d{4})\s*</g,
      /["'\s](\d{6})["'\s]/g,
    ];
    for (const regex of standalonePatterns) {
      for (const match of content.matchAll(regex)) {
        if (match[1]) add(match[1], "数字匹配");
      }
    }
  }

  return results;
}
