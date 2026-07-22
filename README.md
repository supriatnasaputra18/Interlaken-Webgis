# 🛰️ Deteksi Perubahan Tutupan Lahan Interlaken, Swiss (2020 & 2025)

Proyek analisis perubahan tutupan lahan di Kota Interlaken, Swiss, menggunakan citra satelit **Sentinel-2** dan algoritma klasifikasi **Random Forest**, divisualisasikan dalam WebGIS interaktif.

---

## 👥 Anggota Kelompok

| Nama | NIM |
|---|---|
| Davina Maulidya Maghfira | 1242002052 |
| Muhammad Khoiruddin | 1242002026 |
| Muhammad Afzaal Ghofran | 1232002004 |
| Nuraini | 1232002077 |
| Salvina Rosalie | 1232002074 |
| Supriatna Saputra | 1232002067 |

**Mata Kuliah:** Kapita Selekta & Mahadata — Universitas Bakrie

---

## 🌍 Informasi Studi

| | |
|---|---|
| **Kota/Wilayah** | Interlaken, Kanton Bern, Swiss |
| **Objek Klasifikasi** | Vegetasi vs Bangunan (2 kelas) |
| **Periode** | 2020 & 2025 (composite Juli–Agustus) |
| **Sumber Citra** | Sentinel-2 Surface Reflectance Harmonized (resolusi 10m) |
| **Metode** | Random Forest (150 trees), cloud masking berbasis band SCL |
| **Akurasi Model** | 94,64% (Kappa 0,893) |

---

## 🔗 Tautan

- **WebGIS (Live):** https://interlaken-webgis.vercel.app/
- **Script GEE:** https://code.earthengine.google.com/a973923d548488ed179181facb59533a
- **Laporan Lengkap (PDF):** _(tautan menyusul)_

---

## 🚀 Cara Membuka WebGIS

**Opsi 1 — Online (paling mudah)**
Klik langsung tautan WebGIS di atas.

**Opsi 2 — Offline / dari repository ini**
1. Unduh atau clone repository ini
2. Buka folder `webgis/`
3. Buka file `index.html` dua kali klik — akan langsung terbuka di browser (Chrome/Firefox/Edge), tanpa perlu instalasi apapun

---

## 🗺️ Fitur WebGIS

WebGIS terdiri dari 5 tab + 1 fitur pendukung:

1. **Home** — ringkasan proyek & statistik utama
2. **Peta Hasil** — peta interaktif (basemap, batas kota, klasifikasi 2020/2025, target bangunan/vegetasi, gain/loss, popup info, layer control)
3. **Data & Proses** — transparansi metodologi (sumber data, preprocessing, ground truth, parameter model)
4. **Evaluasi Model** — confusion matrix, accuracy, precision, recall, F1-score, keterbatasan model
5. **Insight Hasil** — ringkasan perubahan, lokasi & pola perubahan terbesar, rekomendasi
6. **Chatbot Statis** — mempermudah menjawab/menjelaskan hasil analisis & insight hasil

---

## 🧰 Teknologi

Sentinel-2 · Google Earth Engine · Random Forest · Leaflet.js · Chart.js · GeoJSON/GeoTIFF · Python (rasterio, numpy) · JavaScript
