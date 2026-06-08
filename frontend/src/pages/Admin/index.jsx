import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../../context/AuthContext';
import { showToast } from '../../components/Toast';
import {
  HiOutlineUsers, HiOutlineLocationMarker, HiOutlineCube, HiOutlineUserGroup,
  HiOutlineClipboardList, HiOutlineTrash, HiOutlinePencil, HiOutlinePlus,
  HiOutlineCash, HiOutlineX, HiOutlineCheck
} from 'react-icons/hi';

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: HiOutlineClipboardList },
  { id: 'destinations', label: 'Destinations', icon: HiOutlineLocationMarker },
  { id: 'packages',     label: 'Packages',     icon: HiOutlineCube },
  { id: 'vendors',      label: 'Vendors',      icon: HiOutlineUserGroup },
  { id: 'bookings',     label: 'Bookings',     icon: HiOutlineClipboardList },
  { id: 'users',        label: 'Users',        icon: HiOutlineUsers }
];

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (user && !user.isAdmin) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-dark">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your Promise Paradise data</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                tab === t.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-gray-500 hover:text-dark'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'destinations' && <DestinationsTab />}
      {tab === 'packages' && <PackagesTab />}
      {tab === 'vendors' && <VendorsTab />}
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    API.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);
  if (!stats) return <p className="text-gray-500">Loading stats…</p>;
  const cards = [
    { label: 'Users', value: stats.users, icon: HiOutlineUsers, color: 'bg-blue-50 text-blue-700' },
    { label: 'Bookings (Total)', value: stats.bookings, icon: HiOutlineClipboardList, color: 'bg-purple-50 text-purple-700' },
    { label: 'Confirmed', value: stats.confirmedBookings, icon: HiOutlineCheck, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Pending', value: stats.pendingBookings, icon: HiOutlineClipboardList, color: 'bg-amber-50 text-amber-700' },
    { label: 'Destinations', value: stats.destinations, icon: HiOutlineLocationMarker, color: 'bg-rose-50 text-rose-700' },
    { label: 'Packages', value: stats.packages, icon: HiOutlineCube, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Vendors', value: stats.vendors, icon: HiOutlineUserGroup, color: 'bg-cyan-50 text-cyan-700' },
    { label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: HiOutlineCash, color: 'bg-gold/10 text-gold' }
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const I = c.icon;
        return (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
              <I className="w-5 h-5" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-dark mt-1">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Generic JSON-form editor ────────────────────────────────────────
function JsonEditModal({ open, onClose, title, initial, onSave }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(JSON.stringify(initial ?? {}, null, 2));
  }, [open, initial]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl font-bold text-dark">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-dark"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="font-mono text-xs border border-gray-200 rounded-xl p-3 flex-1 min-h-[400px] focus:outline-none focus:border-gold"
          spellCheck={false}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2 border border-gray-200 rounded-xl text-sm">Cancel</button>
          <button
            onClick={() => {
              try {
                const parsed = JSON.parse(text);
                onSave(parsed);
              } catch (err) {
                showToast('Invalid JSON: ' + err.message, 'error');
              }
            }}
            className="px-5 py-2 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90"
          >Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Generic CRUD table for collections ──────────────────────────────
function CrudTab({ resource, columns, prefillFields, label }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);   // item being edited
  const [creating, setCreating] = useState(false); // creating new

  const load = () => API.get(`/admin/${resource}`).then(r => setItems(r.data)).catch(() => showToast(`Failed to load ${resource}`, 'error'));
  useEffect(() => { load(); }, [resource]);

  const handleSave = async (data) => {
    try {
      if (editing) {
        await API.put(`/admin/${resource}/${editing.id}`, data);
        showToast(`${label} updated`, 'success');
      } else {
        await API.post(`/admin/${resource}`, data);
        showToast(`${label} created`, 'success');
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/${resource}/${id}`);
      showToast(`${label} deleted`, 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} {label.toLowerCase()}{items.length === 1 ? '' : 's'}</p>
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 flex items-center gap-1.5">
          <HiOutlinePlus className="w-4 h-4" /> Add {label}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(c => <th key={c.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</th>)}
              <th className="px-4 py-3 w-32 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 text-dark max-w-xs truncate">
                    {c.render ? c.render(item) : String(item[c.key] ?? '—')}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(item)} className="text-gold hover:text-gold/80 mr-3"><HiOutlinePencil className="w-4 h-4 inline" /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4 inline" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={columns.length + 1} className="text-center py-8 text-gray-400">No data</td></tr>}
          </tbody>
        </table>
      </div>

      <JsonEditModal
        open={!!editing || creating}
        onClose={() => { setEditing(null); setCreating(false); }}
        title={editing ? `Edit ${label}` : `New ${label}`}
        initial={editing || prefillFields}
        onSave={handleSave}
      />
    </div>
  );
}

// ─── Tab Implementations ─────────────────────────────────────────────
function DestinationsTab() {
  return <CrudTab
    resource="destinations"
    label="Destination"
    prefillFields={{
      name: '', country: '', city: '', imageUrl: '', description: '',
      climate: '', bestSeason: '', pricePerDay: 0, isInternational: false,
      highlights: [],
      subPlaces: [
        { name: '', type: '', capacity: 0, description: '' }
      ]
    }}
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'city', label: 'Location' },
      { key: 'pricePerDay', label: 'Price/Day', render: d => `₹${(d.pricePerDay || 0).toLocaleString('en-IN')}` },
      { key: 'isInternational', label: 'Type', render: d => d.isInternational ? 'International' : 'Domestic' },
      { key: 'subPlaces', label: 'Venues', render: d => `${(d.subPlaces || []).length} venue(s)` }
    ]}
  />;
}

function PackagesTab() {
  return <CrudTab
    resource="packages"
    label="Package"
    prefillFields={{
      name: '', destination: '', description: '', duration: '3 days',
      guestCount: '100-200', price: 0, tier: 'premium', includes: [], vendors: [], imageUrl: ''
    }}
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'destination', label: 'Destination' },
      { key: 'tier', label: 'Tier' },
      { key: 'price', label: 'Price', render: p => `₹${(p.price || 0).toLocaleString('en-IN')}` }
    ]}
  />;
}

function VendorsTab() {
  return <CrudTab
    resource="vendors"
    label="Vendor"
    prefillFields={{
      name: '', category: 'Photography', priceRange: '', rating: 4.5,
      description: '', phone: '', email: '', city: '', specialties: [], destinationIds: []
    }}
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'city', label: 'City' },
      { key: 'rating', label: 'Rating' }
    ]}
  />;
}

function BookingsTab() {
  const [bookings, setBookings] = useState([]);

  const load = () => API.get('/admin/bookings').then(r => setBookings(r.data)).catch(() => showToast('Failed to load bookings', 'error'));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking? This cannot be undone.')) return;
    try {
      await API.delete(`/admin/bookings/${id}`);
      showToast('Booking deleted', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{bookings.length} booking{bookings.length === 1 ? '' : 's'}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-4 py-3 w-20 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-dark font-mono text-xs">{b.id}</td>
                <td className="px-4 py-3 text-dark max-w-[120px] truncate" title={b.userEmail}>{b.userName || b.userId?.slice(0, 8) + '…'}</td>
                <td className="px-4 py-3 text-dark">{b.type}</td>
                <td className="px-4 py-3 text-dark max-w-[120px] truncate">{b.destinationName || b.destinationId}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{b.status}</span></td>
                <td className="px-4 py-3 text-dark">₹{(b.totalAmount || b.payment?.amount || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-dark">₹{(b.payment?.paidAmount || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4 inline" /></button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No bookings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Users tab is read-mostly — admin sees emails & booking counts (not full details)
function UsersTab() {
  const [users, setUsers] = useState([]);
  const load = () => API.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this user account? Their bookings will remain.')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      showToast('User removed', 'success');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{users.length} registered user{users.length === 1 ? '' : 's'}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Bookings</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Confirmed</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-dark">
                  {u.name}
                  {u.isAdmin && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">ADMIN</span>}
                </td>
                <td className="px-4 py-3 text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                <td className="px-4 py-3 text-dark font-medium">{u.bookingCount}</td>
                <td className="px-4 py-3 text-emerald-600 font-medium">{u.confirmedBookings}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-right">
                  {!u.isAdmin && (
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600"><HiOutlineTrash className="w-4 h-4 inline" /></button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No users yet</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 italic mt-3">For privacy, only summary booking counts are shown — not individual booking details.</p>
    </div>
  );
}
