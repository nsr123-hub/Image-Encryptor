<div className="min-h-screen bg-gradient-to-r from-purple-100 via-blue-50 to-pink-50 flex flex-col items-center p-8">
  <h1 className="text-4xl font-bold mb-8">Classified Images</h1>

  <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mb-8">
    <h2 className="text-2xl font-semibold mb-4">Encrypt Image</h2>
    <input
      type="file"
      className="mb-2"
      onChange={handleFileUpload}
    />
    <input
      type="password"
      className="w-full p-2 rounded border mb-4"
      placeholder="Password"
      value={password}
      onChange={e => setPassword(e.target.value)}
    />
    <button className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:opacity-90 transition">
      Encrypt
    </button>
  </div>
</div>