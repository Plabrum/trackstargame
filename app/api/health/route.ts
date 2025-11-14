import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Test database connection by querying packs table
    const { count, error } = await supabase
      .from("packs")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Database connection error:", error);
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          error: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Supabase connection successful",
      packs_count: count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
