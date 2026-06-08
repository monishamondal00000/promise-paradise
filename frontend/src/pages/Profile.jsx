import React, { useState, useEffect, useRef } from 'react';
import { API, useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiPhone, FiSave, FiCheck, FiCamera, FiTrash2 } from 'react-icons/fi';
import { showToast } from '../components/Toast';

export default function Profile() {
  const { user, updateUserLocal, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast('Name and email are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await API.put('/auth/profile', form);
      // Update context immediately with response so UI reflects new values
      if (updateUserLocal) updateUserLocal(res.data);
      else if (refreshUser) await refreshUser();
      showToast('Profile updated successfully!', 'success');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to update profile';
      showToast(msg, 'error');
      // If token is no longer valid, fall back to a clean re-login
      if (err.response?.status === 401) {
        setTimeout(() => {
          localStorage.removeItem('pp_token');
          window.location.href = '/login';
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }
    setUploadingPic(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await API.put('/auth/profile-picture', { profilePicture: reader.result });
          if (updateUserLocal) updateUserLocal(res.data);
          else if (refreshUser) await refreshUser();
          showToast('Profile picture updated!', 'success');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to upload picture', 'error');
        } finally {
          setUploadingPic(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingPic(false);
      showToast('Failed to read file', 'error');
    }
  };

  const handleRemovePicture = async () => {
    setUploadingPic(true);
    try {
      const res = await API.delete('/auth/profile-picture');
      if (updateUserLocal) updateUserLocal(res.data);
      else if (refreshUser) await refreshUser();
      showToast('Profile picture removed', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to remove picture', 'error');
    } finally {
      setUploadingPic(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gradient-to-b from-ivory to-white">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-3">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-gold/20" />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-gold to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                <FiUser className="w-10 h-10 text-white" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute bottom-0 right-0 w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center shadow-md hover:bg-gold/90 transition-all border-2 border-white"
            >
              <FiCamera className="w-4 h-4" />
            </button>
            {user?.profilePicture && (
              <button
                onClick={handleRemovePicture}
                disabled={uploadingPic}
                className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-all border-2 border-white"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureUpload}
              className="hidden"
            />
          </div>
          {uploadingPic && <p className="text-xs text-gold animate-pulse">Uploading...</p>}
          <h1 className="text-2xl font-semibold text-dark">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Update your personal details</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gold text-white rounded-xl font-medium text-sm hover:bg-gold/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {saved ? <><FiCheck className="w-4 h-4" /> Saved!</> : <><FiSave className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Changes'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
