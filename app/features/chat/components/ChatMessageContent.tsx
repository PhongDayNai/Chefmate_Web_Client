"use client";

import { Fragment, type ReactNode } from "react";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
}

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "heading"; level: number; text: string }
  | { type: "divider" };

function splitInlineMarkdown(text: string): Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }> {
  const tokens: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean }> = [];
  let index = 0;

  while (index < text.length) {
    const codeMatch = text.slice(index).match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ text: codeMatch[1], code: true });
      index += codeMatch[0].length;
      continue;
    }

    const boldMatch = text.slice(index).match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      tokens.push({ text: boldMatch[2], bold: true });
      index += boldMatch[0].length;
      continue;
    }

    const italicMatch = text.slice(index).match(/^(\*|_)([^*_]+?)\1/);
    if (italicMatch) {
      tokens.push({ text: italicMatch[2], italic: true });
      index += italicMatch[0].length;
      continue;
    }

    let nextIndex = text.length;
    const markers = ["`", "**", "__", "*", "_"];
    markers.forEach((marker) => {
      const markerIndex = text.indexOf(marker, index + 1);
      if (markerIndex !== -1 && markerIndex < nextIndex) {
        nextIndex = markerIndex;
      }
    });

    const plainText = text.slice(index, nextIndex);
    if (plainText) {
      tokens.push({ text: plainText });
    }
    index = nextIndex;
  }

  return tokens;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return splitInlineMarkdown(text).map((token, index) => {
    if (token.code) {
      return (
        <code key={`${token.text}-${index}`} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em] font-semibold">
          {token.text}
        </code>
      );
    }

    if (token.bold) {
      return <strong key={`${token.text}-${index}`}>{token.text}</strong>;
    }

    if (token.italic) {
      return <em key={`${token.text}-${index}`}>{token.text}</em>;
    }

    return <Fragment key={`${token.text}-${index}`}>{token.text}</Fragment>;
  });
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    const unorderedItems: string[] = [];
    while (index < lines.length) {
      const listMatch = lines[index].match(/^\s*[-*]\s+(.*)$/);
      if (!listMatch) break;
      unorderedItems.push(listMatch[1].trim());
      index += 1;
    }
    if (unorderedItems.length) {
      blocks.push({ type: "unordered-list", items: unorderedItems });
      continue;
    }

    const orderedItems: string[] = [];
    while (index < lines.length) {
      const listMatch = lines[index].match(/^\s*\d+\.\s+(.*)$/);
      if (!listMatch) break;
      orderedItems.push(listMatch[1].trim());
      index += 1;
    }
    if (orderedItems.length) {
      blocks.push({ type: "ordered-list", items: orderedItems });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index].trim();
      if (
        !paragraphLine ||
        /^#{1,6}\s+/.test(lines[index]) ||
        /^\s*[-*]\s+/.test(lines[index]) ||
        /^\s*\d+\.\s+/.test(lines[index]) ||
        /^-{3,}$/.test(paragraphLine)
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }

    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
      continue;
    }

    index += 1;
  }

  return blocks;
}

function headingClassName(level: number): string {
  if (level <= 2) return "text-base font-black";
  if (level === 3) return "text-[15px] font-black";
  return "text-sm font-bold";
}

export default function ChatMessageContent({ role, content }: Props) {
  if (role === "user") {
    return <>{content}</>;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "divider") {
          return <hr key={`divider-${blockIndex}`} className="border-0 border-t border-black/10" />;
        }

        if (block.type === "heading") {
          return (
            <p key={`heading-${blockIndex}`} className={headingClassName(block.level)}>
              {renderInlineMarkdown(block.text)}
            </p>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={`ul-${blockIndex}`} className="space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-disc">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={`ol-${blockIndex}`} className="space-y-1.5 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-decimal">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`${line}-${lineIndex}`}>
                {renderInlineMarkdown(line)}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
