"use client";

import { Fragment } from "react";
import { normalizeAssistantText, splitBoldSegments } from "~/features/chat/utils/chatText";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ChatMessageContent({ role, content }: Props) {
  const source = role === "assistant" ? normalizeAssistantText(content) : content;
  const lines = source.split("\n");

  return (
    <>
      {lines.map((line, lineIndex) => {
        const segments = splitBoldSegments(line);
        return (
          <Fragment key={`${line}-${lineIndex}`}>
            {segments.map((segment, segmentIndex) =>
              segment.bold ? (
                <strong key={`${segment.value}-${segmentIndex}`}>{segment.value}</strong>
              ) : (
                <Fragment key={`${segment.value}-${segmentIndex}`}>{segment.value}</Fragment>
              ),
            )}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </Fragment>
        );
      })}
    </>
  );
}
