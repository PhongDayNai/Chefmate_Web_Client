export function normalizeAssistantText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const noHeading = line.replace(/^#{1,6}\s+/, "");
      return noHeading.replace(/^\s*[-*]\s+/, "• ");
    })
    .join("\n");
}

export function splitBoldSegments(text: string): Array<{ value: string; bold: boolean }> {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean);
  return parts.map((part) => {
    const isBold = (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part));
    return {
      value: isBold ? part.slice(2, -2) : part,
      bold: isBold,
    };
  });
}
