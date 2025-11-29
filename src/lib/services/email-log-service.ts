/**
 * Email Logging Service
 *
 * Logs all email delivery attempts to the database for monitoring and debugging.
 * Tracks success/failure, provider used, retry attempts, and error details.
 */

import { prisma } from "@/lib/database/prisma";
import type {
  EmailProvider,
  EmailStatus,
  EmailType,
  Prisma,
} from "@prisma/client";

export interface CreateEmailLogParams {
  to: string;
  subject: string;
  emailType?: EmailType;
  provider: EmailProvider;
  status: EmailStatus;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attempts?: number;
  usedFallback?: boolean;
  userId?: string;
  bookingId?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateEmailLogParams {
  status?: EmailStatus;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  attempts?: number;
  usedFallback?: boolean;
  sentAt?: Date;
}

/**
 * Create a new email log entry
 */
export async function createEmailLog(
  params: CreateEmailLogParams
): Promise<string> {
  try {
    const log = await prisma.emailLog.create({
      data: {
        to: params.to,
        subject: params.subject,
        emailType: params.emailType || "OTHER",
        provider: params.provider,
        status: params.status,
        messageId: params.messageId,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        attempts: params.attempts || 1,
        usedFallback: params.usedFallback || false,
        userId: params.userId,
        bookingId: params.bookingId,
        metadata: params.metadata,
        sentAt: params.status === "SENT" ? new Date() : null,
      },
    });
    return log.id;
  } catch (error) {
    // Don't throw - logging should not break email sending
    console.error("[email-log] Failed to create email log:", error);
    return "";
  }
}

/**
 * Update an existing email log entry
 */
export async function updateEmailLog(
  id: string,
  params: UpdateEmailLogParams
): Promise<void> {
  if (!id) return;

  try {
    await prisma.emailLog.update({
      where: { id },
      data: {
        ...params,
        sentAt: params.status === "SENT" ? new Date() : undefined,
      },
    });
  } catch (error) {
    // Don't throw - logging should not break email sending
    console.error("[email-log] Failed to update email log:", error);
  }
}

/**
 * Log a successful email send
 */
export async function logEmailSuccess(params: {
  to: string;
  subject: string;
  emailType?: EmailType;
  provider: EmailProvider;
  messageId: string;
  usedFallback?: boolean;
  attempts?: number;
  userId?: string;
  bookingId?: string;
}): Promise<string> {
  return createEmailLog({
    to: params.to,
    subject: params.subject,
    emailType: params.emailType,
    provider: params.provider,
    status: "SENT",
    messageId: params.messageId,
    usedFallback: params.usedFallback || false,
    attempts: params.attempts || 1,
    userId: params.userId,
    bookingId: params.bookingId,
  });
}

/**
 * Log a failed email send
 */
export async function logEmailFailure(params: {
  to: string;
  subject: string;
  emailType?: EmailType;
  provider: EmailProvider;
  errorCode?: string;
  errorMessage: string;
  usedFallback?: boolean;
  attempts?: number;
  userId?: string;
  bookingId?: string;
}): Promise<string> {
  return createEmailLog({
    to: params.to,
    subject: params.subject,
    emailType: params.emailType,
    provider: params.provider,
    status: "FAILED",
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    usedFallback: params.usedFallback || false,
    attempts: params.attempts || 1,
    userId: params.userId,
    bookingId: params.bookingId,
  });
}

/**
 * Get recent email logs for a recipient
 */
export async function getEmailLogsByRecipient(
  email: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    subject: string;
    emailType: EmailType;
    status: EmailStatus;
    provider: EmailProvider;
    createdAt: Date;
    errorMessage: string | null;
  }>
> {
  return prisma.emailLog.findMany({
    where: { to: email },
    select: {
      id: true,
      subject: true,
      emailType: true,
      status: true,
      provider: true,
      createdAt: true,
      errorMessage: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get email statistics for monitoring
 */
export async function getEmailStats(hours = 24): Promise<{
  total: number;
  sent: number;
  failed: number;
  byProvider: Record<string, number>;
  byType: Record<string, number>;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [total, sent, failed, byProvider, byType] = await Promise.all([
    prisma.emailLog.count({ where: { createdAt: { gte: since } } }),
    prisma.emailLog.count({
      where: { createdAt: { gte: since }, status: "SENT" },
    }),
    prisma.emailLog.count({
      where: { createdAt: { gte: since }, status: "FAILED" },
    }),
    prisma.emailLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
    prisma.emailLog.groupBy({
      by: ["emailType"],
      where: { createdAt: { gte: since } },
      _count: true,
    }),
  ]);

  return {
    total,
    sent,
    failed,
    byProvider: Object.fromEntries(
      byProvider.map((p) => [p.provider, p._count])
    ),
    byType: Object.fromEntries(byType.map((t) => [t.emailType, t._count])),
  };
}
