import fetch from 'node-fetch'; // Sesuaikan jika ACS menggunakan axios atau fetch bawaan Node 18+

export class SiJfiService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.SIJFI_API_URL || 'http://localhost:3000/api/integration/pegawai';
    this.apiKey = process.env.SIJFI_API_KEY || '';
  }

  /**
   * Fetch data pegawai dari Web App Lain (si-jfi)
   * @param params Query parameters (nip, search, include_riwayat, dll)
   */
  async getPegawaiData(params?: {
    nip?: string;
    search?: string;
    include_riwayat?: boolean;
    include_ak?: boolean;
    include_cat?: boolean;
  }) {
    if (!this.apiKey) {
      console.warn('SIJFI_API_KEY is not configured in .env. Skipping external fetch.');
      return null;
    }

    try {
      const url = new URL(this.apiUrl);
      if (params) {
        if (params.nip) url.searchParams.append('nip', params.nip);
        if (params.search) url.searchParams.append('search', params.search);
        if (params.include_riwayat) url.searchParams.append('include_riwayat', 'true');
        if (params.include_ak) url.searchParams.append('include_ak', 'true');
        if (params.include_cat) url.searchParams.append('include_cat', 'true');
      }

      console.log(`[SiJfiService] Fetching data from: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("[SiJfiService] Gagal terhubung ke Web App si-jfi:", error.message);
      return null;
    }
  }
}
