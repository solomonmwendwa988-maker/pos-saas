import { storage, wait, makeId } from './storage';

const KEY = 'categories';

class CategoryService {
  async list() {
    await wait(150);
    return storage.read(KEY, []);
  }

  async create(payload) {
    await wait(200);
    const items = storage.read(KEY, []);
    const category = { id: makeId('c'), name: payload.name.trim() };
    items.push(category);
    storage.write(KEY, items);
    return category;
  }

  async update(id, patch) {
    await wait(200);
    const items = storage.read(KEY, []).map(c =>
      c.id === id ? { ...c, ...patch, name: patch.name.trim() } : c
    );
    storage.write(KEY, items);
    return items.find(c => c.id === id);
  }

  async remove(id) {
    await wait(200);
    const items = storage.read(KEY, []).filter(c => c.id !== id);
    storage.write(KEY, items);
    return { id };
  }

  async reset() {
    storage.remove(KEY);
  }
}

export const categoryService = new CategoryService();