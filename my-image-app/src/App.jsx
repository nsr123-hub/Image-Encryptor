import React, { useEffect, useState } from "react";

// Replace with your backend URL or set VITE_API_URL in .env
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [encryptPassword, setEncryptPassword] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  const [encryptedData, setEncryptedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState(null);
  const [status, setStatus] = useState("");

  // cleanup object URLs
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (decryptedPreview) URL.revokeObjectURL(decryptedPreview);
    };
  }, [imagePreview, decryptedPreview]);

  const resetStatus = (msg = "") => {
    setStatus(msg);
    if (msg) window.setTimeout(() => setStatus(""), 5000);
  };

  // ENCRYPT
  const handleEncrypt = async () => {
    if (loading) return;
    if (!image) return resetStatus("Select an image first");
    if (!encryptPassword) return resetStatus("Enter password for encryption");

    setLoading(true);
    resetStatus("Encrypting...");

    try {
      const form = new FormData();
      form.append("file", image);
      form.append("password", encryptPassword);

      const res = await fetch(`${API_URL}/encrypt`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        resetStatus(err.error || "Encryption failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEncryptedData(data);

      // automatic download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encrypted_image.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      resetStatus("Encryption finished — downloaded encrypted JSON.");
    } catch (e) {
      console.error(e);
      resetStatus("Encryption error");
    } finally {
      setLoading(false);
    }
  };

  // UPLOAD ENCRYPTED JSON
  const handleEncryptedUpload = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const required = ["salt", "nonce", "ciphertext", "mime_type"];
        const missing = required.filter((k) => !(k in parsed));
        if (missing.length) {
          resetStatus("Invalid encrypted JSON: missing " + missing.join(", "));
          return;
        }
        setEncryptedData(parsed);
        setDecryptedPreview(null);
        resetStatus("Encrypted JSON loaded");
      } catch (err) {
        resetStatus("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  // DECRYPT
  const handleDecrypt = async () => {
    if (loading) return;
    if (!encryptedData) return resetStatus("Upload encrypted JSON first");
    if (!decryptPassword) return resetStatus("Enter password for decryption");

    setLoading(true);
    resetStatus("Decrypting...");

    try {
      const payload = {
        salt: encryptedData.salt,
        nonce: encryptedData.nonce,
        ciphertext: encryptedData.ciphertext,
        mime_type: encryptedData.mime_type,
        password: decryptPassword,
      };

      const res = await fetch(`${API_URL}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        resetStatus(err.error || "Decryption failed");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDecryptedPreview(url);

      // automatic download with extension
      const extension = (encryptedData.mime_type || "image/png").split("/")[1] || "png";
      const a = document.createElement("a");
      a.href = url;
      a.download = `decrypted_image.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      resetStatus("Decryption successful — image downloaded.");
    } catch (err) {
      console.error(err);
      resetStatus("Decryption error");
    } finally {
      setLoading(false);
    }
  };

  // small password strength indicator (very basic)
  const pwdStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s += 1;
    if (/[A-Z]/.test(p)) s += 1;
    if (/[0-9]/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p)) s += 1;
    return s; // 0..4
  };

  return (
    <div className="app-root" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      {/* background flowchart (subtle) */}
      <svg className="flow-bg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <g opacity="0.08">
          <rect x="80" y="60" width="220" height="70" rx="12" fill="#000" />
          <text x="190" y="103" fill="#fff" fontSize="14" fontFamily="sans-serif" textAnchor="middle">Select Image</text>

          <rect x="420" y="60" width="220" height="70" rx="12" fill="#000" />
          <text x="530" y="103" fill="#fff" fontSize="14" fontFamily="sans-serif" textAnchor="middle">Encrypt (server)</text>

          <rect x="760" y="60" width="320" height="70" rx="12" fill="#000" />
          <text x="920" y="103" fill="#fff" fontSize="14" fontFamily="sans-serif" textAnchor="middle">Encrypted JSON (download / share)</text>

          <path d="M300 95 L420 95" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <path d="M640 95 L760 95" stroke="#000" strokeWidth="2" strokeLinecap="round" />

          <rect x="420" y="240" width="220" height="70" rx="12" fill="#000" />
          <text x="530" y="283" fill="#fff" fontSize="14" fontFamily="sans-serif" textAnchor="middle">Upload JSON</text>

          <rect x="760" y="240" width="220" height="70" rx="12" fill="#000" />
          <text x="870" y="283" fill="#fff" fontSize="14" fontFamily="sans-serif" textAnchor="middle">Decrypt (server)</text>

          <path d="M800 130 L800 240" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>

      <div className="container">
        <header className="hero">
          <div>
            <h1 className="title">Classified Images</h1>
            <p className="subtitle">Encrypt images with a password and safely transport the encrypted JSON — decrypt it back to an image whenever you need.</p>
          </div>
          <div className="logo-pill">🔒</div>
        </header>

        <main className="grid">
          {/* ENCRYPT CARD */}
          <section className="card">
            <h2 className="card-title">Encrypt</h2>

            <label className="dropzone">
              <input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImage(f);
                setImagePreview(URL.createObjectURL(f));
              }} disabled={loading} />

              <div className="drop-inner">
                <div className="drop-emoji">📁</div>
                <div className="drop-text">Click or drop image here</div>
                <div className="drop-hint">PNG / JPG / GIF — max 10MB</div>
              </div>
            </label>

            {imagePreview && (
              <div className="preview">
                <img src={imagePreview} alt="preview" />
              </div>
            )}

            <input className="input" type="password" placeholder="Encryption password" value={encryptPassword} onChange={(e) => setEncryptPassword(e.target.value)} disabled={loading} />

            <div className="pw-row">
              <div className="strength">
                <div className={`bar s-${pwdStrength(encryptPassword)}`} />
              </div>
              <div className="pw-help">Use at least 8 chars, mix letters & numbers</div>
            </div>

            <div className="actions">
              <button className="btn primary" onClick={handleEncrypt} disabled={loading}>{loading ? 'Working…' : 'Encrypt & Download JSON'}</button>
            </div>
          </section>

          {/* DECRYPT CARD */}
          <section className="card">
            <h2 className="card-title">Decrypt</h2>

            <div className="file-row">
              <input id="jsonUpload" type="file" accept=".json" onChange={handleEncryptedUpload} disabled={loading} />
            </div>

            <input className="input" type="password" placeholder="Decryption password" value={decryptPassword} onChange={(e) => setDecryptPassword(e.target.value)} disabled={loading} />

            <div className="actions">
              <button className="btn secondary" onClick={handleDecrypt} disabled={loading}>{loading ? 'Working…' : 'Decrypt & Download Image'}</button>
            </div>

            {decryptedPreview && (
              <div className="preview">
                <h4 className="preview-title">Decrypted Preview</h4>
                <img src={decryptedPreview} alt="decrypted" />
              </div>
            )}
          </section>
        </main>

        <footer className="status-row">
          <div className="status">{status || 'Ready'}</div>
          <div className="credits">Built with ❤️ · Matches Flask API</div>
        </footer>
      </div>

      {/* lightweight styles so this file works without Tailwind (but Tailwind will enhance it) */}
      <style>{`
        :root{--bg:#0f172a33;--card:#ffffff;--muted:#6b7280;--accent1:#7c3aed;--accent2:#06b6d4}
        .app-root{min-height:100vh;background:linear-gradient(180deg,#f8fafc 0%, #fff 100%);display:flex;align-items:center;justify-content:center;padding:36px}
        .flow-bg{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none}
        .container{width:100%;max-width:1100px}
        .hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .title{font-size:28px;margin:0}
        .subtitle{color:var(--muted);margin:6px 0 0}
        .logo-pill{background:linear-gradient(90deg,var(--accent1),var(--accent2));color:white;padding:12px;border-radius:12px;font-size:20px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .card{background:var(--card);border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(2,6,23,0.06)}
        .card-title{margin:0 0 12px;font-size:18px}
        .dropzone{display:block;border:2px dashed rgba(15,23,42,0.06);border-radius:10px;padding:18px;cursor:pointer;text-align:center}
        .dropzone input{display:none}
        .drop-inner{display:flex;flex-direction:column;align-items:center}
        .drop-emoji{font-size:28px}
        .drop-text{font-weight:600;margin-top:8px}
        .drop-hint{color:var(--muted);font-size:12px;margin-top:6px}
        .preview{margin-top:12px}
        .preview img{max-width:100%;border-radius:8px}
        .input{width:100%;padding:10px;border-radius:8px;border:1px solid #e6e9ef;margin-top:12px}
        .actions{margin-top:14px;display:flex;gap:10px}
        .btn{padding:10px 14px;border-radius:10px;border:0;cursor:pointer;font-weight:600}
        .btn.primary{background:linear-gradient(90deg,var(--accent1),var(--accent2));color:white}
        .btn.secondary{background:transparent;border:1px solid #e6e9ef}
        .pw-row{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
        .strength{width:120px;height:8px;background:#f1f5f9;border-radius:6px;overflow:hidden}
        .strength .bar{height:100%;width:0%;transition:width .2s}
        .strength .s-0{width:0}
        .strength .s-1{width:25%;background:#f97316}
        .strength .s-2{width:50%;background:#f59e0b}
        .strength .s-3{width:75%;background:#10b981}
        .strength .s-4{width:100%;background:#06b6d4}
        .pw-help{color:var(--muted);font-size:12px}
        .file-row input{width:100%}
        .status-row{margin-top:18px;display:flex;justify-content:space-between;align-items:center}
        .status{color:var(--muted)}
        .credits{font-size:13px;color:var(--muted)}

        @media (max-width:880px){
          .grid{grid-template-columns:1fr}
          .hero{flex-direction:column;align-items:flex-start;gap:10px}
        }
      `}</style>
    </div>
  );
}
