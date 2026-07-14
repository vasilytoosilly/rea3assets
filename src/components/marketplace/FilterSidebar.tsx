"use client";

import { X, Package, Layers, Star } from "lucide-react";

// ---------------------------------------------------------------------------
// FilterSidebar — horizontal filter bar above the product grid
// ---------------------------------------------------------------------------

interface AssetTypeOption {
  slug: string;
  name: string;
  count: number;
}

interface TagOption {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  group: string;
}

interface ActiveFilters {
  asset_type: string | null;
  tags: string[];
  division: string | null;
  featured: boolean;
}

interface DivisionOption {
  slug: string;
  count: number;
}

interface FilterSidebarProps {
  assetTypes: AssetTypeOption[];
  tags: TagOption[];
  divisions: DivisionOption[];
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
}

export function FilterSidebar({
  assetTypes,
  tags,
  divisions,
  activeFilters,
  onFilterChange,
}: FilterSidebarProps) {
  const toggleDivision = (slug: string | null) => {
    onFilterChange({ ...activeFilters, division: slug });
  };

  const toggleAssetType = (slug: string | null) => {
    onFilterChange({ ...activeFilters, asset_type: slug });
  };

  const toggleTag = (slug: string) => {
    const current = activeFilters.tags;
    const next = current.includes(slug)
      ? current.filter((t) => t !== slug)
      : [...current, slug];
    onFilterChange({ ...activeFilters, tags: next });
  };

  const removeTag = (slug: string) => {
    onFilterChange({
      ...activeFilters,
      tags: activeFilters.tags.filter((t) => t !== slug),
    });
  };

  const toggleFeatured = () => {
    onFilterChange({ ...activeFilters, featured: !activeFilters.featured });
  };

  const clearAll = () => {
    onFilterChange({ asset_type: null, tags: [], division: null, featured: false });
  };

  const hasActiveFilters = activeFilters.asset_type !== null || activeFilters.tags.length > 0 || activeFilters.division !== null || activeFilters.featured;

  const divisionLabel = (slug: string) =>
    slug === "vault_product" ? "Vault" : slug === "shop_product" ? "Shop" : slug;

  return (
    <div className="space-y-3">
      {/* Division chips */}
      {divisions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Catalog
          </p>
          <div className="flex flex-wrap gap-2">
            {/* "All" chip */}
            <FilterChip
              active={activeFilters.division === null}
              onClick={() => toggleDivision(null)}
            >
              All
            </FilterChip>
            {divisions.map((div) => (
              <FilterChip
                key={div.slug}
                active={activeFilters.division === div.slug}
                onClick={() => toggleDivision(div.slug)}
              >
                <Layers className="h-3 w-3" />
                {divisionLabel(div.slug)}
                <span className="text-[10px] opacity-70">({div.count})</span>
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {/* Featured toggle */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Featured
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={activeFilters.featured} onClick={toggleFeatured}>
            <Star className={`h-3 w-3 ${activeFilters.featured ? "fill-current" : ""}`} />
            Featured
          </FilterChip>
        </div>
      </div>

      {/* Asset type chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {/* "All" chip */}
          <FilterChip
            active={activeFilters.asset_type === null}
            onClick={() => toggleAssetType(null)}
          >
            All
          </FilterChip>
          {assetTypes.map((at) => (
            <FilterChip
              key={at.slug}
              active={activeFilters.asset_type === at.slug}
              onClick={() => toggleAssetType(at.slug)}
            >
              <Package className="h-3 w-3" />
              {at.name}
              <span className="text-[10px] opacity-70">({at.count})</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Tag chips */}
      {tags.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isActive = activeFilters.tags.includes(tag.slug);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.slug)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                      : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  }`}
                  style={
                    isActive && tag.color
                      ? {
                          borderColor: tag.color,
                          color: tag.color,
                          backgroundColor: "transparent",
                          boxShadow: `inset 0 0 0 1px ${tag.color}33`,
                        }
                      : undefined
                  }
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active filter chips (dismissible) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="text-xs text-[var(--text-muted)]">Active:</span>
          {activeFilters.featured && (
            <ActiveFilterChip onRemove={toggleFeatured}>
              <Star className="h-3 w-3 fill-current" />
              Featured
            </ActiveFilterChip>
          )}
          {activeFilters.division && (
            <ActiveFilterChip onRemove={() => toggleDivision(null)}>
              {divisionLabel(activeFilters.division)}
            </ActiveFilterChip>
          )}
          {activeFilters.asset_type && (
            <ActiveFilterChip onRemove={() => toggleAssetType(null)}>
              {assetTypes.find((at) => at.slug === activeFilters.asset_type)?.name ??
                activeFilters.asset_type}
            </ActiveFilterChip>
          )}
          {activeFilters.tags.map((tagSlug) => {
            const tag = tags.find((t) => t.slug === tagSlug);
            return (
              <ActiveFilterChip key={tagSlug} onRemove={() => removeTag(tagSlug)}>
                {tag?.name ?? tagSlug}
              </ActiveFilterChip>
            );
          })}
          <button
            onClick={clearAll}
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
          : "border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      }`}
    >
      {children}
    </button>
  );
}

function ActiveFilterChip({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--accent)]">
      {children}
      <button
        onClick={onRemove}
        className="ml-0.5 opacity-70 hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
