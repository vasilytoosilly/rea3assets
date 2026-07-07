import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod/v4";

const dependencySchema = z.object({
  dependency_id: z.string().uuid(),
  dependency_type: z.enum(["requires", "recommends", "bundles_with"]).default("requires"),
  notes: z.string().nullable().optional(),
});

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = dependencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { dependency_id, dependency_type, notes } = parsed.data;

    if (dependency_id === id) {
      return NextResponse.json({ error: "An asset cannot depend on itself" }, { status: 400 });
    }

    const dep = await prisma.asset.findUnique({ where: { id: dependency_id } });
    if (!dep) {
      return NextResponse.json({ error: "Dependency asset not found" }, { status: 404 });
    }

    // Check for circular dependency: if B already depends on A, A cannot depend on B
    const cycle = await prisma.assetDependency.findFirst({
      where: { asset_id: dependency_id, dependency_id: id },
    });
    if (cycle) {
      return NextResponse.json(
        { error: "Circular dependency: this asset is already a dependency of the target" },
        { status: 409 },
      );
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
