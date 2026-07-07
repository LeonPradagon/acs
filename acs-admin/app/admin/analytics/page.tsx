"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { Activity, Clock, Database, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  metrics: {
    totalTokens: number;
    averageLatency: number;
    errorRate: number;
    activeSessions: number;
  };
  latencyHistory: { timestamp: string; latency: number }[];
  tokenUsageHistory: { date: string; promptTokens: number; completionTokens: number }[];
  topQuestions: { question: string; count: number }[];
}

import apiClient from "@/lib/api-client";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await apiClient.get("/api/admin/analytics");
        setData(res.data?.data);
      } catch (err: any) {
        console.error("Failed to fetch real analytics:", err);
        // Error will result in data remaining null, showing "Data tidak tersedia"
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Memuat metrik sistem waktu nyata...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return <div>Data tidak tersedia</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Analytics Dashboard</h1>
        <p className="text-white/50 mt-1 text-sm md:text-base">Pemantauan metrik sistem, penggunaan token, dan performa AI.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Token Digunakan</CardTitle>
            <Database className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.metrics.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-indigo-400">+12% dari bulan lalu</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Rata-rata Latency</CardTitle>
            <Clock className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.metrics.averageLatency} ms</div>
            <p className="text-xs text-emerald-400">Target &lt; 500ms</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Tingkat Kesalahan (Error Rate)</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{data.metrics.errorRate}%</div>
            <p className="text-xs text-red-400">-0.5% dari minggu lalu</p>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Sesi Aktif</CardTitle>
            <Activity className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{data.metrics.activeSessions}</div>
            <p className="text-xs text-white/50">Pengguna real-time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-white/90">Penggunaan Token LLM</CardTitle>
            <CardDescription className="text-white/50">Perbandingan prompt vs completion token harian</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tokenUsageHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }} />
                <Bar dataKey="promptTokens" name="Prompt" fill="#6366f1" stackId="a" radius={[0, 0, 4, 4]} />
                <Bar dataKey="completionTokens" name="Completion" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-white/90">Performa LLM (Latency)</CardTitle>
            <CardDescription className="text-white/50">Waktu respon rata-rata (ms) per jam</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.latencyHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="timestamp" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }} />
                <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#000", stroke: "#f59e0b", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Questions Table */}
      <Card className="bg-black/40 border-white/5 backdrop-blur-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-white/90">Topik Paling Sering Ditanyakan</CardTitle>
          <CardDescription className="text-white/50">Berdasarkan analisis Semantic Cache</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topQuestions.map((item, index) => (
              <div key={index} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium leading-none text-white/80">{item.question}</p>
                </div>
                <div className="font-medium text-xs text-white/40">
                  {item.count} kueri
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
