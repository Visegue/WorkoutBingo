import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function isPastEndDate(endDate: string | null) {
  if (!endDate) return false;
  return endDate <= new Date().toISOString().slice(0, 10);
}

async function assertBoardAcceptsChecks(cellId: string, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_cells")
    .select("boards!inner(slug, status, end_date)")
    .eq("id", cellId)
    .single();

  if (error || !data) return false;
  const board = Array.isArray(data.boards) ? data.boards[0] : data.boards;
  return (
    board?.slug === slug &&
    board.status === "active" &&
    !isPastEndDate(board.end_date)
  );
}

/**
 * Public API for checking/unchecking cells.
 * POST: check a cell for a member
 * DELETE: uncheck a cell for a member
 *
 * Body: { cellId: string, memberId: string }
 *
 * No auth required — open to anyone (trusted community).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { cellId, memberId } = body;

    if (!cellId || !memberId) {
      return NextResponse.json(
        { error: "cellId and memberId are required" },
        { status: 400 },
      );
    }

    if (!(await assertBoardAcceptsChecks(cellId, slug))) {
      return NextResponse.json(
        { error: "Board is closed for changes" },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("cell_checks")
      .insert({ cell_id: cellId, member_id: memberId });

    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { cellId, memberId } = body;

    if (!cellId || !memberId) {
      return NextResponse.json(
        { error: "cellId and memberId are required" },
        { status: 400 },
      );
    }

    if (!(await assertBoardAcceptsChecks(cellId, slug))) {
      return NextResponse.json(
        { error: "Board is closed for changes" },
        { status: 403 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("cell_checks")
      .delete()
      .eq("cell_id", cellId)
      .eq("member_id", memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
