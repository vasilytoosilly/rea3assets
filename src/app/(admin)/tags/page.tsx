"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  EmptyState,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Tags management page — manage tag groups and their tags
// ---------------------------------------------------------------------------

interface TagGroup {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  tags: Tag[];
}

interface Tag {
  id: string;
  slug: string;
  name: string;
  color: string | null;
}

export default function TagsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/tag-groups");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setGroups(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        subtitle="Organize tags into groups (Genre, Art Style, Engine) for consistent asset classification."
        action={
          <Button onClick={() => setShowCreateGroup(true)}>+ New Group</Button>
        }
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-dashed px-8 py-16"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading tags...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-8 py-16"
          style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          <p className="text-sm" style={{ color: "var(--accent)" }}>Failed to load</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchGroups}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon="🏷️"
          title="No tag groups yet"
          description="Create tag groups like Genre, Art Style, or Game Engine to classify assets."
          action={
            <Button onClick={() => setShowCreateGroup(true)}>+ Create Tag Group</Button>
          }
        />
      )}

      {/* Groups */}
      {!loading && !error && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <TagGroupCard
              key={group.id}
              group={group}
              onRefresh={fetchGroups}
            />
          ))}
        </div>
      )}

      {/* Create group modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => { setShowCreateGroup(false); fetchGroups(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag Group Card — shows group info + its tags
// ---------------------------------------------------------------------------

function TagGroupCard({ group, onRefresh }: { group: TagGroup; onRefresh: () => void }) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupDeleteConfirm, setGroupDeleteConfirm] = useState(false);

  const handleDeleteTag = async (tagSlug: string) => {
    try {
      setGroupError(null);
      const res = await fetch(`/api/tag-groups/${group.slug}/tags/${tagSlug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      setGroupError(String(err));
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setGroupError(null);
      const res = await fetch(`/api/tag-groups/${group.slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onRefresh();
    } catch (err) {
      setGroupError(String(err));
    }
  };

  return (
    <Card className="border-[var(--border-default)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {group.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">{group.slug} · {group.tags.length} tag{group.tags.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAddTag(true)}>+ Tag</Button>
            {groupDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--accent)" }}>Delete?</span>
                <Button size="sm" variant="danger" onClick={handleDeleteGroup}>Yes</Button>
                <Button size="sm" variant="ghost" onClick={() => setGroupDeleteConfirm(false)}>No</Button>
              </div>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setGroupDeleteConfirm(true)}>Delete</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {groupError && (
          <div className="mb-3 rounded-md border p-2 text-sm"
            style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
            {groupError}
            <button onClick={() => setGroupError(null)} className="ml-2 text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {group.tags.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No tags in this group yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => (
              <div
                key={tag.id}
                className="group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  borderColor: tag.color ?? "var(--border-default)",
                  backgroundColor: tag.color ? `${tag.color}1a` : "var(--bg-elevated)",
                  color: tag.color ?? "var(--text-secondary)",
                }}
              >
                {tag.name}
                {deleteConfirm === tag.slug ? (
                  <span className="flex items-center gap-1 ml-1">
                    <button onClick={() => handleDeleteTag(tag.slug)} className="hover:text-[var(--accent)]">✕</button>
                    <button onClick={() => setDeleteConfirm(null)} className="hover:text-[var(--text-primary)]">↩</button>
                  </span>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(tag.slug)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--accent)]"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add tag form */}
        {showAddTag && (
          <AddTagForm
            groupSlug={group.slug}
            onDone={() => { setShowAddTag(false); onRefresh(); }}
            onCancel={() => setShowAddTag(false)}
          />
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add Tag Form — inline form inside a tag group card
// ---------------------------------------------------------------------------

function AddTagForm({ groupSlug, onDone, onCancel }: { groupSlug: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tag-groups/${groupSlug}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          color: color.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border p-4" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">New Tag</h4>
      {error && (
        <p className="mb-2 text-xs" style={{ color: "var(--accent)" }}>{error}</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <Input label="Name" placeholder="Fantasy" value={name} onChange={handleNameChange} />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Input label="Slug" placeholder="fantasy" value={slug} onChange={setSlug} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">Color</label>
          <input
            type="color"
            value={color || "#ffffff"}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-16 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] cursor-pointer"
          />
        </div>
        <div className="flex gap-2 pb-0.5">
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || !slug.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "..." : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Group Modal
// ---------------------------------------------------------------------------

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border p-6"
        style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
        <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-primary)]">Create Tag Group</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Groups organize related tags (e.g. &quot;Genre&quot; contains &quot;Fantasy&quot;, &quot;Sci-Fi&quot;).</p>

        {error && (
          <div className="mt-4 rounded-md border p-3 text-sm"
            style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-muted)", color: "var(--accent)" }}>
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <Input label="Name" placeholder="Genre" value={name} onChange={handleNameChange} />
          <Input label="Slug" placeholder="genre" value={slug} onChange={setSlug} helpText="Lowercase alphanumeric with hyphens." />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button disabled={!name.trim() || !slug.trim() || submitting} onClick={handleCreate}>
            {submitting ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}
