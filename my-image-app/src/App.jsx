import React, { useEffect, useState, useRef } from "react";

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
  const fileInputRef = useRef(null);

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

  const pwdStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s += 1;
    if (/[A-Z]/.test(p)) s += 1;
    if (/[0-9]/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p)) s += 1;
    return s;
  };

  return (
    <div className="app">
      <div className="glass-bg"></div>
      <div className="content">
        <div className="header">
          <div className="title-group">
            <div className="badge">🔒 Secure</div>
            <h1>Image Vault</h1>
            <p>Password-protect your images. Encrypt to JSON, share securely, decrypt anywhere.</p>
          </div>
        </div>

        <div className="cards">
          {/* Encrypt Card */}
          <div className="card encrypt-card">
            <div className="card-header">
              <div className="icon">🔐</div>
              <h2>Encrypt Image</h2>
            </div>
            
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImage(f);
                  setImagePreview(URL.createObjectURL(f));
                }} 
                disabled={loading}
                style={{ display: 'none' }}
              />
              {!imagePreview ? (
                <div className="upload-placeholder">
                  <div className="upload-icon">📷</div>
                  <p>Click to upload image</p>
                  <span>PNG, JPG, GIF • Max 10MB</span>
                </div>
              ) : (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    className="clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setImagePreview(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="password-section">
              <label>Encryption Password</label>
              <div className="password-input">
                <input 
                  type="password" 
                  placeholder="Enter strong password" 
                  value={encryptPassword} 
                  onChange={(e) => setEncryptPassword(e.target.value)} 
                  disabled={loading}
                />
                <div className="strength-bar">
                  <div className={`strength-fill s${pwdStrength(encryptPassword)}`} />
                </div>
              </div>
              <div className="strength-text">
                {['Weak', 'Fair', 'Good', 'Strong', 'Perfect'][pwdStrength(encryptPassword)]}
              </div>
            </div>

            <button 
              className="action-btn primary" 
              onClick={handleEncrypt} 
              disabled={loading || !image || !encryptPassword}
            >
              {loading ? '🔄 Encrypting...' : '🔒 Encrypt & Download'}
            </button>
          </div>

          {/* Decrypt Card */}
          <div className="card decrypt-card">
            <div className="card-header">
              <div className="icon">🔓</div>
              <h2>Decrypt Image</h2>
            </div>

            <div className="file-input-wrapper">
              <label className="file-input-label">
                Choose Encrypted JSON
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleEncryptedUpload} 
                  disabled={loading}
                />
              </label>
              {encryptedData && (
                <div className="file-status">
                  <span>✅ JSON loaded</span>
                  <button 
                    className="clear-btn small"
                    onClick={() => {
                      setEncryptedData(null);
                      setDecryptedPreview(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="password-section">
              <label>Decryption Password</label>
              <input 
                type="password" 
                placeholder="Enter decryption password" 
                value={decryptPassword} 
                onChange={(e) => setDecryptPassword(e.target.value)} 
                disabled={loading}
              />
            </div>

            <button 
              className="action-btn secondary" 
              onClick={handleDecrypt} 
              disabled={loading || !encryptedData || !decryptPassword}
            >
              {loading ? '🔄 Decrypting...' : '🔓 Decrypt & Download'}
            </button>

            {decryptedPreview && (
              <div className="decrypted-preview">
                <h4>✅ Decrypted Image</h4>
                <img src={decryptedPreview} alt="Decrypted" />
              </div>
            )}
          </div>
        </div>

        <div className="status-bar">
          <div className={`status-message ${status ? 'active' : ''}`}>
            {status || 'Ready to secure your images'}
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .app {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .glass-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          z-index: -1;
        }

        .content {
          max-width: 1200px;
          width: 100%;
          z-index: 1;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .title-group h1 {
          font-size: 3rem;
          background: linear-gradient(135deg, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 10px 0;
          font-weight: 800;
        }

        .title-group p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.2rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 8px 20px;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          margin-bottom: 10px;
        }

        .cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 35px 70px rgba(0, 0, 0, 0.2);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .card-header .icon {
          font-size: 2rem;
        }

        .card-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .upload-area {
          border: 3px dashed #e2e8f0;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 25px;
          background: #f8fafc;
        }

        .upload-area:hover {
          border-color: #667eea;
          background: #f1f5f9;
        }

        .upload-placeholder {
          color: #64748b;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }

        .upload-placeholder p {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 5px;
        }

        .upload-placeholder span {
          font-size: 0.9rem;
          opacity: 0.7;
        }

        .image-preview {
          position: relative;
          height: 200px;
          border-radius: 12px;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .clear-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 1rem;
        }

        .password-section {
          margin-bottom: 25px;
        }

        .password-section label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }

        .password-input {
          position: relative;
        }

        .password-input input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
        }

        .password-input input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .strength-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }

        .strength-fill {
          height: 100%;
          transition: all 0.3s ease;
        }

        .strength-fill.s0 { width: 0%; background: transparent; }
        .strength-fill.s1 { width: 25%; background: #ef4444; }
        .strength-fill.s2 { width: 50%; background: #f59e0b; }
        .strength-fill.s3 { width: 75%; background: #10b981; }
        .strength-fill.s4 { width: 100%; background: #3b82f6; }

        .strength-text {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 5px;
          font-weight: 500;
        }

        .action-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .action-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .action-btn.secondary {
          background: white;
          color: #1e293b;
          border: 2px solid #e2e8f0;
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .file-input-wrapper {
          margin-bottom: 25px;
        }

        .file-input-label {
          display: block;
          width: 100%;
          padding: 16px;
          background: #f8fafc;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 600;
          color: #64748b;
        }

        .file-input-label:hover {
          border-color: #667eea;
          background: #f1f5f9;
        }

        .file-input-label input {
          display: none;
        }

        .file-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          margin-top: 12px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .clear-btn.small {
          font-size: 0.8rem;
          padding: 4px 12px;
          height: auto;
          background: #10b981;
          color: white;
        }

        .decrypted-preview {
          margin-top: 20px;
          text-align: center;
        }

        .decrypted-preview h4 {
          color: #059669;
          font-size: 1rem;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .decrypted-preview img {
          max-width: 100%;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .status-bar {
          text-align: center;
          padding: 20px;
        }

        .status-message {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 12px;
          color: #64748b;
          font-weight: 500;
          max-width: 500px;
          margin: 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .status-message.active {
          color: #1e293b;
          background: rgba(16, 185, 129, 0.2);
          border-color: #10b981;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .title-group h1 {
            font-size: 2.2rem;
          }
          
          .card {
            padding: 24px;
          }
          
          body {
            padding: 15px;
          }
        }

        @media (max-width: 500px) {
          .title-group h1 {
            font-size: 1.8rem;
          }
          
          .upload-area {
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
}
