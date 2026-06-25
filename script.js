(function () {
  "use strict";

  // ---------- ELEMENT REFS ----------
  const tabs = document.querySelectorAll(".tab");
  const fieldUrl = document.querySelector('[data-field="url"]');
  const fieldText = document.querySelector('[data-field="text"]');
  const inputUrl = document.getElementById("input-url");
  const inputText = document.getElementById("input-text");
  const charCount = document.getElementById("char-count");
  const inputSize = document.getElementById("input-size");
  const inputEc = document.getElementById("input-ec");
  const inputFg = document.getElementById("input-fg");
  const inputBg = document.getElementById("input-bg");
  const fgHexLabel = document.getElementById("input-fg-hex");
  const bgHexLabel = document.getElementById("input-bg-hex");
  const errorMsg = document.getElementById("error-msg");

  const emptyState = document.getElementById("empty-state");
  const qrWrap = document.getElementById("qr-canvas-wrap");
  const scanLine = document.getElementById("scan-line");
  const previewActions = document.getElementById("preview-actions");
  const previewSource = document.getElementById("preview-source");
  const btnDownload = document.getElementById("btn-download");
  const btnCopy = document.getElementById("btn-copy");

  let mode = "url";
  let hasQR = false;

  // ---------- DEBOUNCE ----------
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ---------- TAB SWITCHING ----------
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      mode = tab.dataset.mode;

      if (mode === "url") {
        fieldUrl.classList.remove("is-hidden");
        fieldText.classList.add("is-hidden");
      } else {
        fieldText.classList.remove("is-hidden");
        fieldUrl.classList.add("is-hidden");
      }
      clearError();
      updateQR();
    });
  });

  // ---------- CHAR COUNTER ----------
  inputText.addEventListener("input", () => {
    charCount.textContent = inputText.value.length;
  });

  // ---------- COLOR LABELS ----------
  inputFg.addEventListener("input", () => {
    fgHexLabel.textContent = inputFg.value.toUpperCase();
  });
  inputBg.addEventListener("input", () => {
    bgHexLabel.textContent = inputBg.value.toUpperCase();
  });

  // ---------- HELPERS ----------
  function clearError() {
    errorMsg.textContent = "";
  }

  function showError(msg) {
    errorMsg.textContent = msg;
  }

  function normalizeUrl(raw) {
    let value = raw.trim();
    if (!value) return null;
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
      value = "https://" + value;
    }
    try {
      new URL(value);
      return value;
    } catch (e) {
      return null;
    }
  }

  function ecLevelMap(code) {
    return {
      L: QRCode.CorrectLevel.L,
      M: QRCode.CorrectLevel.M,
      Q: QRCode.CorrectLevel.Q,
      H: QRCode.CorrectLevel.H,
    }[code];
  }

  function truncateLabel(str, max) {
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "\u2026";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- GET CURRENT INPUT DATA ----------
  function getCurrentData() {
    clearError();
    if (mode === "url") {
      const raw = inputUrl.value;
      if (!raw.trim()) return null;
      const normalized = normalizeUrl(raw);
      if (!normalized) {
        showError("Masukkan alamat URL yang valid, contoh: contoh.com/halaman");
        return null;
      }
      return { data: normalized, label: normalized };
    }
    const text = inputText.value.trim();
    if (!text) return null;
    return { data: text, label: text.replace(/\s+/g, " ") };
  }

  // ---------- UPDATE QR ----------
  function updateQR() {
    const result = getCurrentData();

    if (!result) {
      hasQR = false;
      emptyState.classList.remove("is-hidden");
      qrWrap.classList.add("is-hidden");
      previewActions.classList.add("is-hidden");
      qrWrap.innerHTML = "";
      return;
    }

    hasQR = true;
    const size = parseInt(inputSize.value, 10);
    const ec = ecLevelMap(inputEc.value);
    const fg = inputFg.value;
    const bg = inputBg.value;

    qrWrap.innerHTML = "";
    new QRCode(qrWrap, {
      text: result.data,
      width: size,
      height: size,
      colorDark: fg,
      colorLight: bg,
      correctLevel: ec,
    });

    emptyState.classList.add("is-hidden");
    qrWrap.classList.remove("is-hidden");
    previewActions.classList.remove("is-hidden");

    previewSource.innerHTML =
      "<b>" + (mode === "url" ? "URL" : "Teks") + "</b>" +
      escapeHtml(truncateLabel(result.label, 46));

    scanLine.classList.remove("is-scanning");
    void scanLine.offsetWidth;
    scanLine.classList.add("is-scanning");
    setTimeout(() => {
      scanLine.classList.remove("is-scanning");
    }, 1100);
  }

  // ---------- EVENT LISTENERS ----------

  const debouncedUpdate = debounce(updateQR, 400);
  inputUrl.addEventListener("input", debouncedUpdate);
  inputText.addEventListener("input", debouncedUpdate);

  inputSize.addEventListener("change", () => hasQR && updateQR());
  inputEc.addEventListener("change", () => hasQR && updateQR());
  inputFg.addEventListener("input", () => hasQR && updateQR());
  inputBg.addEventListener("input", () => hasQR && updateQR());

  // ---------- DOWNLOAD ----------
  btnDownload.addEventListener("click", function () {
    const img = qrWrap.querySelector("img");
    const canvas = qrWrap.querySelector("canvas");

    let dataUrl = null;
    if (img && img.src) {
      dataUrl = img.src;
    } else if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    }

    if (!dataUrl) return;

    const link = document.createElement("a");
    const filenameBase = mode === "url" ? "qr-url" : "qr-teks";
    link.download = filenameBase + "-" + Date.now() + ".png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ---------- COPY IMAGE ----------
  btnCopy.addEventListener("click", async function () {
    if (!hasQR) return;

    const img = qrWrap.querySelector("img");
    const canvas = qrWrap.querySelector("canvas");

    let dataUrl = null;
    if (img && img.src) {
      dataUrl = img.src;
    } else if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    }

    if (!dataUrl) return;

    try {
      const padding = 20;
      const blob = await new Promise((resolve, reject) => {
        const imgEl = new Image();
        imgEl.onerror = reject;
        imgEl.onload = () => {
          const c = document.createElement("canvas");
          c.width = imgEl.width + padding * 2;
          c.height = imgEl.height + padding * 2;
          const ctx = c.getContext("2d");
          ctx.fillStyle = inputBg.value;
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(imgEl, padding, padding);
          c.toBlob((b) => resolve(b), "image/png");
        };
        imgEl.src = dataUrl;
      });

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      const orig = btnCopy.innerHTML;
      btnCopy.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        " Tersalin!";
      setTimeout(() => {
        btnCopy.innerHTML = orig;
      }, 2000);
    } catch (_err) {
      showError("Gagal menyalin gambar ke clipboard.");
    }
  });

})();
