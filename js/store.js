// Data storage in the browser (localStorage)
const STORAGE_KEY = 'pramukh-builders-data-v1';

const COLLECTIONS = [
  'projects', 'units', 'bookings', 'payments',
  'materials', 'expenses', 'workers', 'attendance', 'labourPayments'
];

function emptyData() {
  const d = {};
  COLLECTIONS.forEach(c => { d[c] = []; });
  return d;
}

const Store = {
  data: emptyData(),

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.data = Object.assign(emptyData(), JSON.parse(raw));
    } catch (e) {
      this.data = emptyData();
    }
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save data', e);
    }
  },

  replaceAll(data) {
    this.data = Object.assign(emptyData(), data);
    this.save();
  },

  newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  list(coll) {
    return this.data[coll];
  },

  get(coll, id) {
    return this.data[coll].find(x => x.id === id);
  },

  add(coll, obj) {
    const rec = Object.assign({ id: this.newId() }, obj);
    this.data[coll].push(rec);
    this.save();
    return rec;
  },

  update(coll, id, obj) {
    const rec = this.get(coll, id);
    if (rec) Object.assign(rec, obj);
    this.save();
    return rec;
  },

  remove(coll, id) {
    this.data[coll] = this.data[coll].filter(x => x.id !== id);
    this.save();
  }
};
