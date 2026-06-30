"use client";

import React, { useEffect, useState } from "react";
import { User, Shield, Key, Mail, Calendar, Edit3, ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: string;
    clearanceLevel: number;
    createdAt: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // Password Update State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile Update State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        
        const res = await fetch("http://localhost:3002/api/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }
        
        const data = await res.json();
        setUser({
          name: data.name || "Administrator",
          email: data.email,
          role: data.role === "superadmin" ? "Super Admin" : data.role,
          clearanceLevel: data.clearanceLevel || 1,
          createdAt: data.createdAt,
        });
        setEditName(data.name || "Administrator");
        setEditEmail(data.email || "");
      } catch (e) {
        console.error(e);
        Swal.fire("Error", "Gagal memuat data profile", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      Swal.fire("Peringatan", "Konfirmasi password baru tidak cocok!", "warning");
      return;
    }
    
    if (newPassword.length < 6) {
      Swal.fire("Peringatan", "Password baru harus minimal 6 karakter!", "warning");
      return;
    }

    setUpdatingPassword(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:3002/api/users/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah password");
      }
      
      Swal.fire({
        title: "Sukses!",
        text: "Password Anda berhasil diperbarui",
        icon: "success",
        confirmButtonColor: "#d83545"
      });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editEmail) {
      Swal.fire("Peringatan", "Nama dan Email wajib diisi!", "warning");
      return;
    }

    setUpdatingProfile(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("http://localhost:3002/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, email: editEmail })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah profil");
      }
      
      setUser((prev) => prev ? { ...prev, name: data.name, email: data.email } : null);
      
      // Update local storage so other components (like sidebar) get the new name
      let currentUserObj: any = {};
      const currentUserStr = localStorage.getItem("user");
      if (currentUserStr) {
        try {
          currentUserObj = JSON.parse(currentUserStr);
        } catch (err) {
          console.error("Failed to parse user in localStorage", err);
        }
      }
      
      currentUserObj.name = data.name;
      currentUserObj.email = data.email;
      localStorage.setItem("user", JSON.stringify(currentUserObj));
      
      // Dispatch a storage event so components can update if they are listening
      window.dispatchEvent(new Event("storage"));
      
      Swal.fire({
        title: "Sukses!",
        text: "Data profil berhasil diperbarui",
        icon: "success",
        confirmButtonColor: "#d83545"
      });
      setShowEditModal(false);
      
    } catch (e: any) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black/95 flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-[#d83545]" /></div>;
  if (!user) return <div className="p-8 text-white">Error loading profile.</div>;

  return (
    <div className="min-h-screen bg-black/95 text-white p-8 relative">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto mb-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-2">Manage your account settings and preferences.</p>
          </div>
          <button 
            onClick={() => {
              setEditName(user?.name || "");
              setEditEmail(user?.email || "");
              setShowEditModal(true);
            }}
            className="bg-[#d83545] hover:bg-[#b02a38] text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-[#1C1C1C] rounded-2xl border border-white/10 p-6 flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 bg-[#d83545] rounded-full flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-black/50">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{user.role}</p>
              </div>
              <div className="w-full h-px bg-white/10 my-2" />
              <div className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Details & Settings */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Account Information */}
            <div className="bg-[#1C1C1C] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <User className="w-5 h-5 text-[#d83545]" />
                <h3 className="font-semibold text-lg">Account Information</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                    <div className="font-medium text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5">{user.name}</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
                    <div className="font-medium text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                    <div className="font-medium text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2 capitalize">
                      <Shield className="w-4 h-4 text-[#d83545]" />
                      {user.role}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clearance Level</label>
                    <div className="font-medium text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      Level {user.clearanceLevel}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-[#1C1C1C] rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#d83545]" />
                <h3 className="font-semibold text-lg">Security</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                  <div className="space-y-1">
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">Ubah password untuk keamanan akun Anda.</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg font-medium"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Password Update Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1C] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-[#d83545]" />
                Ubah Password
              </h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Password Saat Ini</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#d83545]/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Password Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#d83545]/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#d83545]/50 transition-all"
                  required
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={updatingPassword}
                  className="px-4 py-2 bg-[#d83545] hover:bg-[#b02a38] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1C] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#d83545]" />
                Edit Profile
              </h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#d83545]/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#d83545]/50 transition-all"
                  required
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={updatingProfile}
                  className="px-4 py-2 bg-[#d83545] hover:bg-[#b02a38] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
