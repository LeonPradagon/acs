import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, FileText, Bug, Send } from "lucide-react";

export type HelpModalType = "tos" | "privacy" | "bug" | null;

interface HelpModalsProps {
  activeModal: HelpModalType;
  onClose: () => void;
}

export function HelpModals({ activeModal, onClose }: HelpModalsProps) {
  const isOpen = activeModal !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {activeModal === "tos" && (
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-6 bg-card border-border/60 shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              Terms of Service
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4 pr-4 custom-scrollbar">
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <h4 className="font-semibold text-foreground text-base">1. Pengantar</h4>
              <p>
                Selamat datang di platform ACS (Agentic Cognitive System). Dengan menggunakan layanan ini, Anda menyetujui persyaratan berikut. 
                Platform ini disediakan secara &quot;as-is&quot; tanpa jaminan apa pun, baik tersurat maupun tersirat.
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">2. Penggunaan Layanan</h4>
              <p>
                Anda berjanji untuk tidak menggunakan layanan ini untuk kegiatan ilegal, spamming, atau mendistribusikan perangkat lunak perusak.
                Sistem memiliki hak untuk membatasi kueri yang terlalu berat guna menjaga stabilitas layanan (Rate Limiting).
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">3. Kekayaan Intelektual</h4>
              <p>
                Semua hak kekayaan intelektual atas perangkat lunak, algoritma, dan desain antarmuka dimiliki oleh pengembang ACS.
                Output AI dapat Anda gunakan untuk kebutuhan bisnis internal Anda.
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">4. Batasan Tanggung Jawab</h4>
              <p>
                Keluaran dari asisten AI adalah berdasarkan model bahasa besar (LLM). Kami tidak menjamin 100% akurasi faktual. Keputusan krusial bisnis harus diverifikasi oleh manusia.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      )}

      {activeModal === "privacy" && (
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-6 bg-card border-border/60 shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4 pr-4 custom-scrollbar">
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <h4 className="font-semibold text-foreground text-base">1. Pengumpulan Data</h4>
              <p>
                Kami mengumpulkan data percakapan Anda, riwayat pencarian (RAG), dan konfigurasi preferensi pengguna untuk memberikan pengalaman *Agentic* yang dipersonalisasi.
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">2. Penyimpanan & Keamanan Data</h4>
              <p>
                Data Anda (termasuk kredensial email App Password) dienkripsi menggunakan protokol standar industri (AES-256-GCM). 
                Kata sandi tidak disimpan dalam bentuk teks biasa.
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">3. Penggunaan Data</h4>
              <p>
                Data *Semantic Memory* dan *Procedural Memory* digunakan secara internal oleh agen AI kami (seperti Planner dan Retriever) untuk meningkatkan kualitas jawaban. 
                Kami tidak menjual data Anda kepada pihak ketiga.
              </p>

              <h4 className="font-semibold text-foreground text-base mt-6">4. Penghapusan Data</h4>
              <p>
                Anda memiliki hak untuk meminta penghapusan seluruh memori konteks dan percakapan Anda dari sistem kapan saja melalui panel admin atau menghubungi support.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      )}

      {activeModal === "bug" && (
        <DialogContent className="sm:max-w-[500px] flex flex-col p-6 bg-card border-border/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Bug className="w-5 h-5 text-red-500" />
              </div>
              Report a Bug
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Judul Bug</label>
              <Input placeholder="Contoh: AI tidak merespon di halaman database" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Deskripsi Lengkap</label>
              <Textarea 
                placeholder="Jelaskan langkah-langkah untuk mereproduksi error ini..." 
                className="min-h-[120px] rounded-xl resize-none"
              />
            </div>
            <div className="pt-2">
              <Button onClick={() => {
                // Simulate sending bug
                setTimeout(() => onClose(), 500);
              }} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2 font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Send className="w-4 h-4" />
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
