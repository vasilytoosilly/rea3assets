"use client";

import {
  Users, Mountain, Package, Box, Boxes, Wrench, ShoppingBag,
  Briefcase, UsersRound, Puzzle, Tag, Tags,
  FileText, Type, Hash, ToggleLeft, ListChecks, Calendar, Link,
  Image, File, Palette, Star, AlignLeft, Shield, Scan, Cpu,
  Sparkles, Droplets, Layers, Trash2, GripVertical,
  ChevronUp, ChevronDown, type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// DynamicIcon — renders a Lucide icon by its string name.
// Used wherever an icon name is stored in the DB (e.g. AssetType.icon).
// Falls back to Package when the name is not recognised.
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  // Asset type icons (stored in DB as strings)
  Users, Mountain, Package, Box, Boxes, Wrench, ShoppingBag,
  Briefcase, UsersRound, Puzzle, Tag, Tags, Layers,

  // Division icons
  "division-vault_product": Package,
  "division-vault_service": Wrench,
  "division-shop_product": ShoppingBag,
  "division-shop_service": Briefcase,
  "division-community": UsersRound,

  // Field type icons
  "field-text": Type,
  "field-textarea": AlignLeft,
  "field-number": Hash,
  "field-boolean": ToggleLeft,
  "field-select": ListChecks,
  "field-multi_select": Tags,
  "field-date": Calendar,
  "field-url": Link,
  "field-image": Image,
  "field-file": File,
  "field-richtext": FileText,
  "field-tags": Tags,
  "field-color": Palette,
  "field-rating": Star,

  // Pipeline processor icons
  "processor-thumbnail": Image,
  "processor-validate-format": Shield,
  "processor-optimize-mesh": Cpu,
  "processor-virus-scan": Scan,
  "processor-generate-description": Sparkles,
  "processor-watermark": Droplets,

  // UI action icons
  "ui-delete": Trash2,
  "ui-drag": GripVertical,
  "ui-expand": ChevronDown,
  "ui-collapse": ChevronUp,
};

interface DynamicIconProps {
  /** The icon key — either a Lucide icon name or a prefixed key (field-*, processor-*, division-*) */
  name: string | null | undefined;
  size?: number;
  className?: string;
  /** Fallback icon name if name is null/unrecognised */
  fallback?: string;
}

export function DynamicIcon({
  name,
  size = 18,
  className = "",
  fallback = "Package",
}: DynamicIconProps) {
  const key = name ?? fallback;
  const Icon = ICON_MAP[key] ?? ICON_MAP[fallback] ?? Package;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

// ---------------------------------------------------------------------------
// Convenience maps for pages that iterate over known sets
// ---------------------------------------------------------------------------

export const FIELD_TYPE_ICONS: Record<string, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  boolean: ToggleLeft,
  select: ListChecks,
  multi_select: Tags,
  date: Calendar,
  url: Link,
  image: Image,
  file: File,
  richtext: FileText,
  tags: Tags,
  color: Palette,
  rating: Star,
};

export const PROCESSOR_ICONS: Record<string, LucideIcon> = {
  thumbnail: Image,
  "validate-format": Shield,
  "optimize-mesh": Cpu,
  "virus-scan": Scan,
  "generate-description": Sparkles,
  watermark: Droplets,
};

export const DIVISION_ICONS: Record<string, LucideIcon> = {
  vault_product: Package,
  vault_service: Wrench,
  shop_product: ShoppingBag,
  shop_service: Briefcase,
  community: UsersRound,
};


