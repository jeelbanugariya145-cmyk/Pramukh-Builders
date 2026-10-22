// Talks to the server. Keeps a local copy of everything the signed-in person may see.
async function api(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'pramukh-view' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'server_error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const COLLECTIONS = [
  'users', 'projects', 'units', 'bookings', 'changeRequests',
  'bills', 'expenses', 'workers', 'attendance', 'labourPayments', 'visitors'
];

const Store = {
  data: {},
  me: null,
  ai: false,

  async load() {
    const data = await api('GET', '/data');
    this.data = {};
    COLLECTIONS.forEach(c => { this.data[c] = data[c] || []; });
    // Collections this person is allowed to see at all
    this.visible = new Set(Object.keys(data));
  },

  has(coll) {
    return this.visible && this.visible.has(coll);
  },

  list(coll) {
    return this.data[coll] || [];
  },

  get(coll, id) {
    return this.list(coll).find(x => x.id === id);
  },

  async add(coll, obj) {
    const rec = await api('POST', `/c/${coll}`, obj);
    this.data[coll].push(rec);
    return rec;
  },

  async update(coll, id, obj) {
    const rec = await api('PUT', `/c/${coll}/${id}`, obj);
    const i = this.data[coll].findIndex(x => x.id === id);
    if (i >= 0) this.data[coll][i] = rec;
    return rec;
  },

  async remove(coll, id) {
    await api('DELETE', `/c/${coll}/${id}`);
    this.data[coll] = this.data[coll].filter(x => x.id !== id);
  },

  // Replaces records the server sent back (e.g. after a bulk change)
  merge(coll, records) {
    records.forEach(rec => {
      const i = this.data[coll].findIndex(x => x.id === rec.id);
      if (i >= 0) this.data[coll][i] = rec; else this.data[coll].push(rec);
    });
  }
};

// Shrinks photos before upload so they go quickly over mobile data
function shrinkImage(file, maxSide = 2000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('bad_file'));
    img.src = URL.createObjectURL(file);
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('bad_file'));
    r.readAsDataURL(file);
  });
}

// Uploads a photo or PDF and returns the server's file record
async function uploadFile(file) {
  const dataUrl = file.type.startsWith('image/') && file.type !== 'image/gif'
    ? await shrinkImage(file)
    : await readAsDataUrl(file);
  return api('POST', '/upload', { name: file.name, dataUrl });
}

const fileUrl = id => `/api/files/${encodeURIComponent(id)}`;
