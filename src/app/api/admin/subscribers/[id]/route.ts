import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    let body: { active?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid" },
        { status: 400 }
      );
    }

    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Status aktif (active) harus bernilai boolean" },
        { status: 400 }
      );
    }

    const existing = await db.subscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan newsletter tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await db.subscriber.update({
      where: { id },
      data: { active: body.active },
    });

    return NextResponse.json({
      success: true,
      message: `Status pelanggan berhasil diubah menjadi ${body.active ? "Aktif" : "Nonaktif"}`,
      subscriber: updated,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal memperbarui status pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    const existing = await db.subscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan newsletter tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Pelanggan newsletter berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal menghapus pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
