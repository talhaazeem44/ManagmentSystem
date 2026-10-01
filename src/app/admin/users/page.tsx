'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { PERMISSION_SECTIONS } from '@/lib/constants';

interface StaffUser {
    _id: string;
    name: string;
    email: string;
    role: 'superadmin' | 'admin' | 'user' | 'workshop';
    permissions?: string[];
    createdAt?: string;
}

const emptyForm = { name: '', email: '', password: '', role: 'user' as StaffUser['role'], permissions: [] as string[] };

export default function AdminUsersPage() {
    const { toasts, showToast, removeToast } = useToast();
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(emptyForm);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
            else showToast('Could not load users — are you logged in as admin?', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const togglePermission = (list: string[], key: string) =>
        list.includes(key) ? list.filter(k => k !== key) : [...list, key];

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                showToast('User created', 'success');
                setForm(emptyForm);
                fetchUsers();
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed to create user' }));
                showToast(err.message, 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (u: StaffUser) => {
        setEditingId(u._id);
        setEditForm({ name: u.name, email: u.email, password: '', role: u.role, permissions: u.permissions ?? [] });
    };

    const handleSaveEdit = async (id: string) => {
        setSaving(true);
        try {
            const body: any = { name: editForm.name, role: editForm.role, permissions: editForm.permissions };
            if (editForm.password) body.password = editForm.password;
            const res = await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                showToast('User updated', 'success');
                setEditingId(null);
                fetchUsers();
            } else {
                const err = await res.json().catch(() => ({ message: 'Failed to update user' }));
                showToast(err.message, 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this user? They will no longer be able to log in.')) return;
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('User deleted', 'success');
            fetchUsers();
        } else {
            const err = await res.json().catch(() => ({ message: 'Failed to delete user' }));
            showToast(err.message, 'error');
        }
    };

    return (
        <DashboardLayout>
            <div className="animate-fade-in">
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.3rem' }}>👑 Staff & Access</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Create logins for your staff and control exactly which sections each one can see.
                </p>

                <div className="grid-2" style={{ alignItems: 'start', gap: '1.5rem' }}>
                    {/* ── New User ── */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>+ New Staff Login</div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <input className="input" placeholder="Full name" required
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <input className="input" type="email" placeholder="Email" required
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            <input className="input" type="password" placeholder="Password" required
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            <select className="select" value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value as StaffUser['role'], permissions: [] })}>
                                <option value="user">Staff (main system)</option>
                                <option value="workshop">Workshop only</option>
                                <option value="admin">Admin (full business access)</option>
                                <option value="superadmin">Superadmin (can manage staff logins)</option>
                            </select>

                            {form.role === 'user' && (
                                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 700 }}>
                                        Allowed sections {form.permissions.length === 0 && '(none checked = full access)'}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {PERMISSION_SECTIONS.map(s => (
                                            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.permissions.includes(s.key)}
                                                    onChange={() => setForm({ ...form, permissions: togglePermission(form.permissions, s.key) })} />
                                                {s.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Creating...' : '✅ Create Login'}
                            </button>
                        </form>
                    </div>

                    {/* ── Existing Users ── */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>Existing Logins</div>
                        {loading ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Loading...</div>
                        ) : users.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No users found.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {users.map(u => (
                                    <div key={u._id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                                        {editingId === u._id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <input className="input" style={{ fontSize: '0.82rem' }} value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                                <input className="input" style={{ fontSize: '0.82rem' }} value={editForm.email} disabled />
                                                <input className="input" style={{ fontSize: '0.82rem' }} type="password" placeholder="New password (leave blank to keep current)"
                                                    value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                                                <select className="select" style={{ fontSize: '0.82rem' }} value={editForm.role}
                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value as StaffUser['role'] })}>
                                                    <option value="user">Staff (main system)</option>
                                                    <option value="workshop">Workshop only</option>
                                                    <option value="admin">Admin (full access)</option>
                                                </select>
                                                {editForm.role === 'user' && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {PERMISSION_SECTIONS.map(s => (
                                                            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                                                <input type="checkbox" checked={editForm.permissions.includes(s.key)}
                                                                    onChange={() => setEditForm({ ...editForm, permissions: togglePermission(editForm.permissions, s.key) })} />
                                                                {s.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                                                        disabled={saving} onClick={() => handleSaveEdit(u._id)}>
                                                        {saving ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                                                        onClick={() => setEditingId(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, background: u.role === 'superadmin' ? 'rgba(168,85,247,0.15)' : u.role === 'admin' ? 'rgba(239,68,68,0.12)' : u.role === 'workshop' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)', color: u.role === 'superadmin' ? '#a855f7' : u.role === 'admin' ? '#ef4444' : u.role === 'workshop' ? '#3b82f6' : '#10b981' }}>
                                                            {u.role.toUpperCase()}
                                                        </span>
                                                        {u.role === 'user' && (u.permissions?.length ?? 0) > 0 && u.permissions!.map(p => (
                                                            <span key={p} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                                                                {PERMISSION_SECTIONS.find(s => s.key === p)?.label ?? p}
                                                            </span>
                                                        ))}
                                                        {u.role === 'user' && (u.permissions?.length ?? 0) === 0 && (
                                                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Full access</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                    <button className="btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                                                        onClick={() => startEdit(u)}>✏️</button>
                                                    <button className="btn" style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                                        onClick={() => handleDelete(u._id)}>🗑️</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Toast toasts={toasts} removeToast={removeToast} />
        </DashboardLayout>
    );
}
