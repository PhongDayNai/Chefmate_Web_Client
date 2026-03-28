"use client";

import type { ChatMessage } from "~/features/chat/types";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateLabel(date: Date, now: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  return year === currentYear ? `${day}-${month}` : `${day}-${month}-${year}`;
}

export function formatSessionTimeLabel(createdAt?: string, now = new Date()): string {
  if (!createdAt) return "Không rõ thời gian";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Không rõ thời gian";

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const secondMs = 1000;
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    const seconds = Math.max(1, Math.floor(diffMs / secondMs));
    return `${seconds} giây trước`;
  }

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(diffMs / hourMs);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(diffMs / dayMs);
  if (days < 30) return `${days} ngày trước`;

  return formatDateLabel(date, now);
}

export function shouldShowSessionDivider(timeline: ChatMessage[], index: number): boolean {
  if (index === 0) return true;

  const current = timeline[index];
  const previous = timeline[index - 1];
  if (!current || !previous) return false;

  if (current.isSessionStart) return true;

  return Boolean(
    current.chatSessionId &&
      previous.chatSessionId &&
      current.chatSessionId !== previous.chatSessionId,
  );
}
