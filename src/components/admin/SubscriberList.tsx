"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Check,
  X,
  Mail,
  Calendar,
} from "lucide-react";

export interface SubscriberItem {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface SubscriberListProps {
  onCountsUpdate?: (counts: { total: number; active: number }) => void;
}

export function SubscriberList({ onCountsUpdate }: SubscriberListProps) {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar pelanggan");
      }

      const list: SubscriberItem[] = Array.isArray(data.subscribers) ? data.subscribers : [];
      setSubscribers(list);

      if (onCountsUpdate) {
        onCountsUpdate({
          total: data.totalCount ?? list.length,
          active: data.activeCount ?? list.filter((s) => s.active).length,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, onCountsUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscribers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSubscribers]);

  const handleToggleActive = async (subscriber: SubscriberItem) => {
    setActionLoadingId(subscriber.id);
    try {
      const nextActive = !subscriber.active;
      const res = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status pelanggan");
      }

      setSubscribers((prev) =>
        prev.map((s) => (s.id === subscriber.id ? { ...s, active: nextActive } : s))
      );
      setSuccessNotification(
        `Pelanggan ${subscriber.email} kini berstatus ${nextActive ? "Aktif" : "Nonaktif"}.`
      );
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memperbarui status.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!window.confirm(`Yakin ingin menghapus ${email} dari daftar pelanggan?`)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/subscribers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus pelanggan");
      }

      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      setSuccessNotification(`Pelanggan ${email} berhasil dihapus.`);
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menghapus data.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification banners */}
      {successNotification && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Control Bar: Filter, Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari email pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 text-xs">
            {(["all", "active", "inactive"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all capitalize cursor-pointer ${
                  statusFilter === tab
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab === "all" ? "Semua" : tab === "active" ? "Aktif" : "Nonaktif"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSubscribers}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Subscriber List Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading && subscribers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs">Memuat daftar pelanggan newsletter...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Belum ada pelanggan newsletter
              </p>
              <p className="text-xs text-gray-500">
                Pelanggan baru yang mendaftar melalui formulir web akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="col-span-6">Alamat Email</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Terdaftar Sejak</div>
                <div className="col-span-2 text-right">Aksi</div>
              </div>

              {subscribers.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">
                      {item.email}
                    </span>
                  </div>

                  <div className="col-span-2">
                    {item.active ? (
                      <Badge variant="success" className="text-[10px] py-0.5 px-2">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0.5 px-2">
                        Nonaktif
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-2 text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={actionLoadingId === item.id}
                      title={item.active ? "Nonaktifkan pelanggan" : "Aktifkan pelanggan"}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {item.active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscriber(item.id, item.email)}
                      disabled={actionLoadingId === item.id}
                      title="Hapus pelanggan"
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
