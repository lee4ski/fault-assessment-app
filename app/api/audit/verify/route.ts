import { NextRequest, NextResponse } from "next/server";
import { verifyAuditHash } from "@/lib/audit";
import { AuditLog } from "@/types";

// In-memory storage (same as main audit route)
// In production, this should use the same database
const auditLogs: AuditLog[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logId } = body;

    const log = auditLogs.find((l) => l.id === logId);

    if (!log) {
      return NextResponse.json(
        { error: "Audit log not found" },
        { status: 404 }
      );
    }

    const isValid = verifyAuditHash(log);

    return NextResponse.json(
      {
        logId: log.id,
        isValid,
        timestamp: log.timestamp,
        action: log.action,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Audit verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify audit log" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("logId");

    if (!logId) {
      return NextResponse.json(
        { error: "logId parameter is required" },
        { status: 400 }
      );
    }

    const log = auditLogs.find((l) => l.id === logId);

    if (!log) {
      return NextResponse.json(
        { error: "Audit log not found" },
        { status: 404 }
      );
    }

    const isValid = verifyAuditHash(log);

    return NextResponse.json(
      {
        logId: log.id,
        isValid,
        timestamp: log.timestamp,
        action: log.action,
        hash: log.hash,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Audit verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify audit log" },
      { status: 500 }
    );
  }
}

