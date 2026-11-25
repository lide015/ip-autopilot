/*
 * 雲端版後端（Backend adapter）：資料在 Cloudflare D1、影片在 R2，需要密碼登入。
 * 介面與根目錄的 store.js 完全相同。
 */
window.Backend = (() => {
  async function call(path, opt = {}) {
    let res;
    try {
      res = await fetch(path, {
        method: opt.method || 'GET',
        headers: { 'x-app': '1', ...(opt.body !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined,
        credentials: 'same-origin',
      });
    } catch (e) { throw new Error('連不上伺服器，請檢查網路'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || '操作失敗，請再試一次'), { status: res.status });
    return data;
  }
  function putMedia(file, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('PUT', '/api/upload?name=' + encodeURIComponent(file.name));
      x.setRequestHeader('x-app', '1');
      x.setRequestHeader('content-type', file.type || 'video/mp4');
      x.upload.onprogress = (ev) => { if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100)); };
      x.onload = () => {
        let r = {};
        try { r = JSON.parse(x.responseText); } catch (e) { /* 非 JSON */ }
        if (x.status >= 200 && x.status < 300 && r.key) resolve(r.key); else reject(new Error(r.error || '上傳失敗，請再試一次'));
      };
      x.onerror = () => reject(new Error('網路中斷，上傳失敗'));
      x.send(file);
    });
  }
  const path = (key) => '/' + key.split('/').map(encodeURIComponent).join('/');
  async function mediaUrl(key) { return path(key); }
  async function downloadMedia(key) { const a = document.createElement('a'); a.href = path(key) + '?dl=1'; a.click(); }
  const exportData = () => call('/api/export');
  async function importData(data) { const r = await call('/api/import', { method: 'POST', body: data }); return r.count; }
  async function usage() { return null; }
  const features = { login: true, local: false, uploadMax: 100 * 1024 * 1024, uploadNote: '100 MB 以下直接上傳到你的雲端空間', keyNote: '金鑰存在你自己的雲端資料庫，只在伺服器端使用，不會傳回瀏覽器。' };
  return { features, call, putMedia, mediaUrl, downloadMedia, exportData, importData, usage };
})();
