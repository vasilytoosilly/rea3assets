import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Run ID → test data marker
// ---------------------------------------------------------------------------

let runCounter = 0;

export function nextRunId(): number {
  return ++runCounter;
}

export function marker(runId: number): string {
  return `__test_${runId}`;
}

// ---------------------------------------------------------------------------
// Factory: AssetType
// ---------------------------------------------------------------------------

export async function createTestAssetType(
  runId: number,
  overrides?: Partial<{
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    division: string;
    is_internal: boolean;
    is_public: boolean;
    sort_order: number;
  }>,
) {
  const m = marker(runId);
  const slug = overrides?.slug ?? `${m}-asset-type`;
  const name = overrides?.name ?? `${m} Asset Type`;

  return prisma.assetType.create({
    data: {
      slug,
      name,
      description: overrides?.description ?? null,
      icon: overrides?.icon ?? null,
      division: overrides?.division ?? "vault_product",
      is_internal: overrides?.is_internal ?? true,
      is_public: overrides?.is_public ?? false,
      sort_order: overrides?.sort_order ?? 0,
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: Asset
// ---------------------------------------------------------------------------

export async function createTestAsset(
  runId: number,
  assetTypeId: string,
  overrides?: Partial<{
    slug: string;
    name: string;
    description: string | null;
    division: string;
    metadata: Record<string, unknown>;
    status: string;
    sku: string | null;
  }>,
) {
  const m = marker(runId);
  const slug = overrides?.slug ?? `${m}-asset-${Math.random().toString(36).slice(2, 8)}`;
  const name = overrides?.name ?? `${m} Asset`;

  return prisma.asset.create({
    data: {
      asset_type_id: assetTypeId,
      slug,
      name,
      description: overrides?.description ?? null,
      division: overrides?.division ?? "vault_product",
      metadata: overrides?.metadata ? JSON.parse(JSON.stringify(overrides.metadata)) : {},
      status: (overrides?.status as "draft") ?? "draft",
      sku: overrides?.sku ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: AssetVersion
// ---------------------------------------------------------------------------

export async function createTestVersion(
  runId: number,
  assetId: string,
  version?: string,
) {
  const m = marker(runId);
  const ver = version ?? "1.0.0";

  return prisma.assetVersion.create({
    data: {
      asset_id: assetId,
      version: ver,
      changelog: `${m} changelog`,
      format: ".rbxm",
      status: "ready",
    },
  });
}

// ---------------------------------------------------------------------------
// Factory: TagGroup + nested Tags
// ---------------------------------------------------------------------------

export async function createTestTagGroup(
  runId: number,
  overrides?: Partial<{
    slug: string;
    name: string;
    tagNames: string[];
  }>,
) {
  const m = marker(runId);
  const slug = overrides?.slug ?? `${m}-tag-group`;
  const name = overrides?.name ?? `${m} Tag Group`;
  const tagNames = overrides?.tagNames ?? ["Tag A", "Tag B"];

  const group = await prisma.tagGroup.create({
    data: {
      slug,
      name,
    },
  });

  if (tagNames.length > 0) {
    await prisma.tag.createMany({
      data: tagNames.map((t) => ({
        group_id: group.id,
        slug: t.toLowerCase().replace(/\s+/g, "-"),
        name: t,
        color: null,
      })),
    });
  }

  return prisma.tagGroup.findUnique({
    where: { id: group.id },
    include: { tags: true },
  })!;
}

// ---------------------------------------------------------------------------
// Factory: PipelineConfig + Steps
// ---------------------------------------------------------------------------

export async function createTestPipeline(
  runId: number,
  assetTypeId: string,
  overrides?: Partial<{
    name: string;
    steps: { processor: string; config?: Record<string, unknown>; sort_order?: number }[];
  }>,
) {
  const m = marker(runId);
  const name = overrides?.name ?? `${m} Pipeline`;
  const steps = overrides?.steps ?? [
    { processor: "thumbnail", sort_order: 0 },
    { processor: "validate-format", sort_order: 1 },
  ];

  const pipeline = await prisma.pipelineConfig.create({
    data: {
      asset_type_id: assetTypeId,
      name,
      is_default: false,
    },
  });

  if (steps.length > 0) {
    await prisma.pipelineStep.createMany({
      data: steps.map((s) => ({
        pipeline_id: pipeline.id,
        processor: s.processor,
        config: s.config ? JSON.parse(JSON.stringify(s.config)) : null,
        sort_order: s.sort_order ?? 0,
        on_failure: "stop",
      })),
    });
  }

  return prisma.pipelineConfig.findUnique({
    where: { id: pipeline.id },
    include: { steps: { orderBy: { sort_order: "asc" } } },
  })!;
}

// ---------------------------------------------------------------------------
// Per-test cleanup: delete supplied IDs in FK-safe order
// ---------------------------------------------------------------------------

export async function cleanupTestData(artifacts: {
  assetIds?: string[];
  assetTypeIds?: string[];
  tagGroupIds?: string[];
  pipelineIds?: string[];
}): Promise<void> {
  const { assetIds = [], assetTypeIds = [], tagGroupIds = [], pipelineIds = [] } = artifacts;

  // PipelineStepResult → PipelineRun → PipelineStep → PipelineConfig
  if (pipelineIds.length > 0) {
    for (const pid of pipelineIds) {
      await prisma.pipelineStepResult.deleteMany({
        where: { run: { pipeline_id: pid } },
      });
      await prisma.pipelineRun.deleteMany({ where: { pipeline_id: pid } });
      await prisma.pipelineStep.deleteMany({ where: { pipeline_id: pid } });
    }
    await prisma.pipelineConfig.deleteMany({
      where: { id: { in: pipelineIds } },
    });
  }

  // AssetDependency → AssetTagAssignment → AssetFieldValue → AssetThumbnail → AssetVersion → Asset
  if (assetIds.length > 0) {
    await prisma.assetDependency.deleteMany({
      where: { OR: [{ asset_id: { in: assetIds } }, { dependency_id: { in: assetIds } }] },
    });
    await prisma.assetTagAssignment.deleteMany({
      where: { asset_id: { in: assetIds } },
    });
    await prisma.assetFieldValue.deleteMany({
      where: { asset_id: { in: assetIds } },
    });
    await prisma.assetThumbnail.deleteMany({
      where: { asset_id: { in: assetIds } },
    });
    await prisma.assetVersion.deleteMany({
      where: { asset_id: { in: assetIds } },
    });
    await prisma.asset.deleteMany({
      where: { id: { in: assetIds } },
    });
  }

  // AssetTypeField → AssetType
  if (assetTypeIds.length > 0) {
    await prisma.assetTypeField.deleteMany({
      where: { asset_type_id: { in: assetTypeIds } },
    });
    await prisma.assetType.deleteMany({
      where: { id: { in: assetTypeIds } },
    });
  }

  // Tag → TagGroup
  if (tagGroupIds.length > 0) {
    await prisma.tag.deleteMany({
      where: { group_id: { in: tagGroupIds } },
    });
    await prisma.tagGroup.deleteMany({
      where: { id: { in: tagGroupIds } },
    });
  }
}

// ---------------------------------------------------------------------------
// Nuclear cleanup: delete ALL rows with __test_ in names/slugs
// ---------------------------------------------------------------------------

export async function nukeTestData(): Promise<void> {
  // Collect IDs in reverse-dependency order, then delete

  // --- Asset cleanup ---
  const assetTypes = await prisma.assetType.findMany({
    where: { slug: { contains: "__test_" } },
    select: { id: true },
  });
  const assetTypeIds = assetTypes.map((a) => a.id);

  // Find assets belonging to test asset types OR with test slugs
  const assets = await prisma.asset.findMany({
    where: {
      OR: [
        { asset_type_id: { in: assetTypeIds } },
        { slug: { contains: "__test_" } },
      ],
    },
    select: { id: true },
  });
  const assetIds = assets.map((a) => a.id);

  // Pipeline configs
  const pipelines = await prisma.pipelineConfig.findMany({
    where: { asset_type_id: { in: assetTypeIds } },
    select: { id: true },
  });
  const pipelineIds = pipelines.map((p) => p.id);

  // Tag groups
  const tagGroups = await prisma.tagGroup.findMany({
    where: { slug: { contains: "__test_" } },
    select: { id: true },
  });
  const tagGroupIds = tagGroups.map((g) => g.id);

  // Delete in FK-safe order

  // Pipeline chain
  for (const pid of pipelineIds) {
    await prisma.pipelineStepResult.deleteMany({ where: { run: { pipeline_id: pid } } });
    await prisma.pipelineRun.deleteMany({ where: { pipeline_id: pid } });
    await prisma.pipelineStep.deleteMany({ where: { pipeline_id: pid } });
  }
  if (pipelineIds.length > 0) {
    await prisma.pipelineConfig.deleteMany({ where: { id: { in: pipelineIds } } });
  }

  // Asset chain
  if (assetIds.length > 0) {
    for (const aid of assetIds) {
      await prisma.pipelineStepResult.deleteMany({
        where: { run: { asset_version: { asset_id: aid } } },
      });
      await prisma.pipelineRun.deleteMany({
        where: { asset_version: { asset_id: aid } },
      });
    }
    await prisma.assetDependency.deleteMany({
      where: { OR: [{ asset_id: { in: assetIds } }, { dependency_id: { in: assetIds } }] },
    });
    await prisma.assetTagAssignment.deleteMany({ where: { asset_id: { in: assetIds } } });
    await prisma.assetFieldValue.deleteMany({ where: { asset_id: { in: assetIds } } });
    await prisma.assetThumbnail.deleteMany({ where: { asset_id: { in: assetIds } } });
    await prisma.assetVersion.deleteMany({ where: { asset_id: { in: assetIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }

  // Also find standalone assets with __test_ in slug that might not match by type
  // (already covered above via slug: contains query)

  // Asset types
  if (assetTypeIds.length > 0) {
    await prisma.assetTypeField.deleteMany({ where: { asset_type_id: { in: assetTypeIds } } });
    await prisma.assetType.deleteMany({ where: { id: { in: assetTypeIds } } });
  }

  // Tag groups + tags
  if (tagGroupIds.length > 0) {
    await prisma.tag.deleteMany({ where: { group_id: { in: tagGroupIds } } });
    await prisma.tagGroup.deleteMany({ where: { id: { in: tagGroupIds } } });
  }
}
