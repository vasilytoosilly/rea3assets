import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deps = await prisma.assetDependency.findMany({
      where: { asset_id: id },
      include: {
        dependency: { select: { id: true, name: true, slug: true, division: true } },
      },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json(deps);
  } catch (error) {
    logger.error("Failed to list dependencies", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { dependency_id, dependency_type, notes } = body;

    if (!dependency_id) {
      return NextResponse.json({ error: "dependency_id is required" }, { status: 400 });
    }

    if (dependency_id === id) {
      return NextResponse.json({ error: "An asset cannot depend on itself" }, { status: 400 });
    }

    const dep = await prisma.asset.findUnique({ where: { id: dependency_id } });
    if (!dep) {
      return NextResponse.json({ error: "Dependency asset not found" }, { status: 404 });
    }

    const created = await prisma.assetDependency.create({
      data: {
        asset_id: id,
        dependency_id,
        dependency_type: dependency_type ?? "requires",
        notes: notes ?? null,
      },
      include: {
        dependency: { select: { id: true, name: true, slug: true } },
      },
    });

    logger.info("Asset dependency created", { assetId: id, depId: dependency_id });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This dependency already exists" },
        { status: 409 },
      );
    }
    logger.error("Failed to create dependency", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
