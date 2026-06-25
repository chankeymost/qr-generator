---
name: qr-generator-maintenance
description: Panduan maintenance untuk proyek QR Generator (HTML/CSS/JS statis). Gunakan skill ini setiap kali user minta menambah fitur, memperbaiki bug, mengubah desain, atau memahami struktur proyek QR Generator — termasuk file index.html, style.css, script.js, dan qrcode.min.js di folder qr-generator. Trigger juga saat user menyebut "QR Generator", "proyek QR", atau menunjuk salah satu dari keempat file tersebut untuk diedit.
---

# QR Generator — Panduan Maintenance

Proyek statis (tanpa build step, tanpa framework) yang generate QR code dari **URL** atau **teks bebas**, langsung di browser. Empat file, harus selalu berada di folder yang sama:

```
qr-generator/
├── index.html      (166 baris) — struktur & semua elemen UI
├── style.css       (517 baris) — desain visual lengkap
├── script.js       (261 baris) — semua logika & interaktivitas
└── qrcode.min.js   (library pihak ketiga, JANGAN diedit)
```

Tidak ada dependency npm, tidak ada server backend. Buka `index.html` langsung di browser untuk testing — atau jalankan `python3 -m http.server` di folder ini lalu akses `localhost:<port>`.

## Konsep desain (jangan dirusak saat menambah fitur)

Identitas visual proyek ini bertema **"scanner/instrumen teknis"** — bukan kartu generik. Elemen kunci yang membentuk identitas ini:

- **Palet warna** (didefinisikan sebagai CSS custom properties di `:root` pada `style.css`): `--ink` (#14171c, hampir hitam), `--paper` (#f2efe6, krem), `--signal` (#ff5a1f, oranye sebagai warna aksen/CTA), `--teal` (#3d5a52, aksen sekunder). **Selalu pakai variabel ini**, jangan hardcode hex baru kecuali memang menambah token baru ke `:root`. Warna latar barcode default adalah putih (`#ffffff`) — diatur via `<input type="color" id="input-bg">`.
- **Tipografi**: `JetBrains Mono` untuk label, tombol, data teknis (kode/URL) — `Inter` untuk teks naratif (hint, deskripsi). Pertahankan pembagian ini; jangan campur sembarangan.
- **Signature element**: garis scan oranye (`.scan-line`) yang menyapu dari atas ke bawah preview QR setiap kali QR digenerate (dipicu otomatis saat input berubah, lihat animasi `@keyframes sweep`). Ini adalah elemen pembeda utama proyek — pertahankan saat refactor.
- **Sudut bingkai** (`.corner-tl/tr/bl/br`) di sekitar area preview mengimitasi viewfinder kamera/scanner. Bagian dari tema yang sama.
- Tombol aksi utama (`.btn-download`, `.btn-copy`) punya **shadow offset solid** (`box-shadow: 4px 4px 0 var(--ink)`) yang mengecil saat ditekan (`:active` → translate) untuk efek "tombol fisik". Pertahankan pola ini untuk tombol-tombol baru yang setara pentingnya.

Jika menambah fitur baru, turunkan gaya dari token-token di atas, bukan membuat palet/font baru.

## Cara kerja `script.js` (baca sebelum mengubah logika)

Semua logika dibungkus dalam satu IIFE `(function(){...})()` agar tidak mencemari global scope. Bagian-bagiannya:

1. **Element refs** — semua `getElementById` dikumpulkan di atas. Kalau menambah elemen baru di HTML, tambahkan referensinya di sini juga, jangan query langsung di tengah fungsi.
2. **Tab switching** (`mode = "url" | "text"`) — toggle `.is-hidden` pada `fieldUrl` / `fieldText`. State mode disimpan di variabel `mode` level-modul.
3. **`normalizeUrl(raw)`** — menambahkan `https://` otomatis jika user tidak mengetik skema, lalu validasi dengan `new URL()`. Return `null` kalau invalid.
4. **`generateQR(data)`** — inti generator. Membersihkan `qrWrap.innerHTML`, lalu instansiasi `new QRCode(qrWrap, {...})` dari library `qrcode.min.js`. Opsi yang dibaca dari form: `width/height` (dari `#input-size`), `colorDark/colorLight` (dari color picker), `correctLevel` (lewat `ecLevelMap()`).
5. **Auto-generate via debounce** — tidak ada tombol generate. Listener `input` pada `inputUrl` / `inputText` memicu `debouncedUpdate` (300ms). Begitu user selesai mengetik, QR langsung digenerate ulang.
6. **Flag `hasQR`** — variabel boolean modul yang `true` setelah QR pertama berhasil dibuat. Input seperti size, EC level, dan warna hanya memicu re-generate jika `hasQR === true` (cegah error empty-state di awal).
7. **Animasi scan-line** — di-trigger ulang dengan trik `void scanLine.offsetWidth` (force reflow) sebelum menambahkan class `is-scanning`, supaya animasi CSS restart setiap kali. Setelah 1100ms, `setTimeout` menghapus class `is-scanning` agar animasi tidak menggantung.
8. **Download PNG** (`btnDownload` listener) — library `qrcode.js` versi ini merender ke `<img>` (bukan langsung `<canvas>` di semua kasus), jadi kode cek `img.src` dulu, fallback ke `canvas.toDataURL()`.
9. **Copy image** (`btnCopy` listener) — mengambil `img.src` atau `canvas.toDataURL()`, lalu menggambar ulang di canvas sementara dengan padding 20px dan warna latar dari `inputBg`. Hasilnya dikonversi ke `Blob` dan disalin ke clipboard via `navigator.clipboard.write([new ClipboardItem(...)])`. Tombol menampilkan "Tersalin!" sebagai feedback selama 2 detik. Jika gagal, `showError()` dipanggil.

### Library QR pihak ketiga

`qrcode.min.js` adalah build dari `davidshimjs/qrcodejs` (MIT license). **Jangan diedit langsung.** API yang dipakai proyek ini:

```js
new QRCode(domElement, {
  text: string,
  width: number,
  height: number,
  colorDark: "#hex",
  colorLight: "#hex",
  correctLevel: QRCode.CorrectLevel.L | M | Q | H
});
```

Kapasitas data QR terbatas oleh `correctLevel` — level lebih tinggi (`H`) = lebih tahan rusak tapi kapasitas data lebih kecil. Kalau user butuh encode teks sangat panjang, turunkan `correctLevel` default atau tambah peringatan di UI, jangan ubah library.

## Skenario maintenance umum

**Menambah mode baru (misal: vCard, WiFi config)**
1. Tambah `<button class="tab" data-mode="vcard">` di `index.html` dalam `.tabs`.
2. Tambah `<div class="field is-hidden" data-field="vcard">` dengan input yang relevan.
3. Di `script.js`, tambah cabang di `form submit` handler untuk mode baru: kumpulkan data, format sesuai standar (vCard pakai format `BEGIN:VCARD...END:VCARD`), assign ke `dataToEncode`.
4. Tab-switching logic (`tabs.forEach` listener) sudah generic terhadap `data-mode` dan `data-field` — tidak perlu diubah kalau penamaan konsisten.

**Mengubah ukuran/warna default**
- Ukuran: edit `<option>` di `#input-size` (HTML), nilai dalam pixel.
- Warna default: edit `value` attribute pada `<input type="color" id="input-fg">` dan `id="input-bg">`, lalu sinkronkan teks label hex di sebelahnya secara manual (`#input-fg-hex`) supaya konsisten saat load awal.

**Bug umum: animasi scan-line tidak jalan saat generate dua kali berturut-turut**
- Pastikan trik `void scanLine.offsetWidth` sebelum `classList.add("is-scanning")` tidak terhapus saat refactor — tanpa ini, browser menganggap animasi "sudah berjalan" dan tidak mengulang dari awal.

**Menambah tombol aksi baru (di samping Unduh/Copy)**
1. Tambah `<button>` di `index.html` dalam `.preview-btn-group`.
2. Gunakan SVG inline sebagai ikon (lihat `btn-download` / `btn-copy` sebagai template).
3. Di `script.js`, tambahkan ref elemen di blok element refs, lalu listener.
4. Jika butuh feedback visual, pakai pola temporal toggle seperti `btnCopy.innerHTML = "... Tersalin!"` + `setTimeout` untuk reset.

**Menambah / mengedit tabel info EC (error correction)**
- Cukup edit HTML di `.ec-info` — CSS sudah siap untuk tabel 4 baris (L/M/Q/H). Jika menambah baris, perhatikan `tr:last-child td` di CSS agar border bawah tidak dobel.

**Menambah validasi input baru**
- Pakai pola `showError(msg)` / `clearError()` yang sudah ada — tampilkan pesan di `#error-msg`, jangan pakai `alert()` (memutus tema, mengganggu UX).

**Mengubah teks UI / copy**
- Semua teks dalam Bahasa Indonesia, register santai-teknis (lihat hint seperti "Boleh tanpa https:// — akan ditambahkan otomatis."). Pertahankan nada ini: instruktif, singkat, tanpa basa-basi formal.

## Aksesibilitas & responsif (jangan dihapus saat redesign)

- `:focus-visible` global dengan outline oranye — wajib ada untuk keyboard navigation.
- `@media (prefers-reduced-motion: reduce)` mematikan animasi `.dot` (pulse) dan `.scan-line` — pertahankan setiap kali menambah animasi baru, tambahkan rule senada.
- `@media (max-width: 860px)` mengubah grid dua kolom (`.layout`) jadi satu kolom dan menghapus border antar panel. Test perubahan layout di lebar ini juga, bukan cuma desktop.

## Privasi

Semua proses generate QR terjadi 100% di sisi client (`qrcode.min.js` jalan di browser, tidak ada `fetch` ke server manapun). Footnote di `index.html` menyatakan ini secara eksplisit (`.footnote`) — kalau menambah fitur yang butuh request ke server (misal shorten URL via API), update klaim ini agar tetap akurat, jangan biarkan jadi klaim palsu.
