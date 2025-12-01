import { AuditLog, AccidentAttributes, SearchResult, AssessmentCriteria } from "@/types";
import crypto from "crypto";

/**
 * Generate hash for audit log to prevent tampering
 */
export function generateAuditHash(log: Omit<AuditLog, "id" | "hash">): string {
  const data = JSON.stringify({
    userId: log.userId,
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    inputConditions: log.inputConditions,
    searchResults: log.searchResults?.map((r) => ({
      criteriaId: r.criteria.id,
      relevanceScore: r.relevanceScore,
      matchType: r.matchType,
    })),
    selectedCriteria: log.selectedCriteria?.id,
  });

  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Verify audit log hash
 */
export function verifyAuditHash(log: AuditLog): boolean {
  const { hash, ...logWithoutHash } = log;
  const expectedHash = generateAuditHash(logWithoutHash);
  return hash === expectedHash;
}

/**
 * Create audit log entry
 */
export function createAuditLog(
  action: "search" | "select" | "calculate",
  inputConditions?: AccidentAttributes | string,
  searchResults?: SearchResult[],
  selectedCriteria?: AssessmentCriteria,
  userId?: string
): Omit<AuditLog, "id"> {
  const timestamp = new Date();
  const log: Omit<AuditLog, "id" | "hash"> = {
    userId,
    timestamp,
    action,
    inputConditions,
    searchResults,
    selectedCriteria,
  };

  const hash = generateAuditHash(log);

  return {
    ...log,
    hash,
  };
}

