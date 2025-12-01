import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { AuditLog } from "@/types";

// In-memory storage for audit logs (in production, use database)
const auditLogs: AuditLog[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, inputConditions, searchResults, selectedCriteria, userId } = body;

    const logEntry = createAuditLog(
      action,
      inputConditions,
      searchResults,
      selectedCriteria,
      userId
    );

    const fullLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...logEntry,
    };

    auditLogs.push(fullLog);

    return NextResponse.json({ success: true, logId: fullLog.id }, { status: 201 });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    let filteredLogs = auditLogs;

    if (userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === userId);
    }

    if (action) {
      filteredLogs = filteredLogs.filter((log) => log.action === action);
    }

    // Return logs sorted by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({ logs: filteredLogs }, { status: 200 });
  } catch (error) {
    console.error("Audit log retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}

