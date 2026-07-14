"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Button, Card, CardHeader, CardBody, Input, EmptyState, ErrorBanner, Modal, Skeleton } from "@/components/ui";
import { Tag as TagIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Tags management page — premium dark aesthetic
// ---------------------------------------------------------------------------

interface TagGroup { id: string; slug: string; name: string; sort_order: number; tags: Tag[]; }
interface Tag { id: string; slug: string; name: string; color: string | null; }

export default function TagsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const fetchGroups = useCallback(async () => {
    try { setLoading(true); setError(null); const res = await fetch("/api/tag-groups"); if (!res.ok) throw new Error(`API returned ${res.status}`); setGroups(await res.json()); }
    catch (err) { setError(String(err)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        subtitle="Organize tags into groups (Genre, Art Style, Engine) for consistent asset classification."
        eyebrow="Classification"
        icon={<TagIcon size={20} />}
        action={<Button onClick={() => setShowCreateGroup(true)}>+ New Group</Button>}
      />

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5" aria-hidden="true">
              <Skeleton className="mb-3 h-4 w-32" /><div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && <ErrorBanner message={error} onRetry={fetchGroups} onDismiss={() => setError(null)} />}

      {!loading && !error && groups.length === 0 && (
        <EmptyState icon={<TagIcon size={48} />} title="No tag groups yet" description="Create tag groups like Genre, Art Style, or Game Engine to classify assets."
          action={<Button onClick={() => setShowCreateGroup(true)}>+ Create Tag Group</Button>} />
      )}

      {!loading && !error && groups.length > 0 && (
        <div className={`space-y-6 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {groups.map((group) => (<TagGroupCard key={group.id} group={group} onRefresh={fetchGroups} />))}
        </div>
      )}

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={() => { setShowCreateGroup(false); fetchGroups(); }} />}
    </div>
  );
}

function TagGroupCard({ group, onRefresh }: { group: TagGroup; onRefresh: () => void }) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupDeleteConfirm, setGroupDeleteConfirm] = useState(false);

  const handleDeleteTag = async (tagSlug: string) => {
    try { setGroupError(null); const res = await fetch(`/api/tag-groups/${group.slug}/tags/${tagSlug}`, { method: "DELETE" }); if (!res.ok) throw new Error("Delete failed"); setDeleteConfirm(null); onRefresh(); }
    catch (err) { setGroupError(String(err)); }
  };
  const handleDeleteGroup = async () => {
    try { setGroupError(null); const res = await fetch(`/api/tag-groups/${group.slug}`, { method: "DELETE" }); if (!res.ok) throw new Error("Delete failed"); onRefresh(); }
    catch (err) { setGroupError(String(err)); }
  };

  return (
    <Card className="rounded-xl border-[var(--border-default)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{group.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{group.slug} · {group.tags.length} tag{group.tags.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAddTag(true)}>+ Tag</Button>
            {groupDeleteConfirm ? (
              <div className="flex items-center gap-1"><span className="text-xs text-[var(--accent)]">Delete?</span><Button size="sm" variant="danger" onClick={handleDeleteGroup}>Yes</Button><Button size="sm" variant="ghost" onClick={() => setGroupDeleteConfirm(false)}>No</Button></div>
            ) : (<Button size="sm" variant="danger" onClick={() => setGroupDeleteConfirm(true)}>Delete</Button>)}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {groupError && <div className="mb-3"><ErrorBanner message={groupError} onDismiss={() => setGroupError(null)} /></div>}
        {group.tags.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No tags in this group yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {group.tags.map((tag) => (
              <div key={tag.id} className="group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: tag.color ?? "var(--border-default)", backgroundColor: tag.color ? `${tag.color}1a` : "var(--bg-elevated)", color: tag.color ?? "var(--text-secondary)" }}>
                {tag.name}
                {deleteConfirm === tag.slug ? (
                  <span className="flex items-center gap-1 ml-1"><button onClick={() => handleDeleteTag(tag.slug)} className="hover:text-[var(--accent)]">✕</button><button onClick={() => setDeleteConfirm(null)} className="hover:text-[var(--text-primary)]">↩</button></span>
                ) : (
                  <button onClick={() => setDeleteConfirm(tag.slug)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--accent)]">×</button>
                )}
              </div>
            ))}
          </div>
        )}
        {showAddTag && <AddTagForm groupSlug={group.slug} onDone={() => { setShowAddTag(false); onRefresh(); }} onCancel={() => setShowAddTag(false)} />}
      </CardBody>
    </Card>
  );
}

function AddTagForm({ groupSlug, onDone, onCancel }: { groupSlug: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [color, setColor] = useState("");
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);
  const handleNameChange = (value: string) => { setName(value); setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); };
  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return; setSubmitting(true); setError(null);
    try { const res = await fetch(`/api/tag-groups/${groupSlug}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug.trim(), color: color.trim() || undefined }) }); if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? `HTTP ${res.status}`); } onDone(); }
    catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  };
  return (
    <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">New Tag</h4>
      {error && <div className="mb-2"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]"><Input label="Name" placeholder="Fantasy" value={name} onChange={handleNameChange} /></div>
        <div className="flex-1 min-w-[100px]"><Input label="Slug" placeholder="fantasy" value={slug} onChange={setSlug} /></div>
        <div><label className="label mb-1.5 block">Color</label><input type="color" value={color || "#ffffff"} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] cursor-pointer" /></div>
        <div className="flex gap-2 pb-0.5"><Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="sm" disabled={!name.trim() || !slug.trim() || submitting} onClick={handleSubmit}>{submitting ? "..." : "Add"}</Button></div>
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<string | null>(null);
  const handleNameChange = (value: string) => { setName(value); setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); };
  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return; setSubmitting(true); setError(null);
    try { const res = await fetch("/api/tag-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slug.trim() }) }); if (!res.ok) { const data = await res.json(); throw new Error(data.error ?? `HTTP ${res.status}`); } onCreated(); }
    catch (err) { setError(String(err)); } finally { setSubmitting(false); }
  };
  return (
    <Modal isOpen={true} onClose={onClose} title="Create Tag Group" description='Groups organize related tags (e.g. "Genre" contains "Fantasy", "Sci-Fi").' maxWidth="max-w-md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button disabled={!name.trim() || !slug.trim() || submitting} onClick={handleCreate}>{submitting ? "Creating..." : "Create Group"}</Button></>}>
      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}
      <div className="space-y-4"><Input label="Name" placeholder="Genre" value={name} onChange={handleNameChange} /><Input label="Slug" placeholder="genre" value={slug} onChange={setSlug} helpText="Lowercase alphanumeric with hyphens." /></div>
    </Modal>
  );
}
