const admin = require('firebase-admin');

let cachedDb = null;

function createMockSnapshot() {
  return {
    empty: true,
    size: 0,
    docs: [],
    forEach: () => {}
  };
}

function createMockDocRef() {
  return {
    async get() {
      return {
        exists: false,
        id: 'mock-doc',
        data: () => null
      };
    },
    async set() {
      return;
    },
    async update() {
      return;
    },
    collection: () => createMockCollection()
  };
}

function createMockCollection() {
  const chainable = {
    where: () => chainable,
    orderBy: () => chainable,
    limit: () => chainable
  };

  return {
    ...chainable,
    doc: () => createMockDocRef(),
    async get() {
      return createMockSnapshot();
    },
    async add() {
      return { id: 'mock-doc' };
    }
  };
}

function createMockDb() {
  return {
    collection: () => createMockCollection()
  };
}

function getDatabaseInstance() {
  if (cachedDb) return cachedDb;

  if (process.env.NODE_ENV === 'production') {
    if (!admin.apps.length) {
      throw new Error('Firebase Admin SDK não inicializado antes do uso do Firestore.');
    }
    cachedDb = admin.firestore();
    return cachedDb;
  }

  cachedDb = createMockDb();
  return cachedDb;
}

function getDb() {
  return getDatabaseInstance();
}

function clearCachedDb() {
  cachedDb = null;
}

module.exports = {
  getDb,
  getDatabaseInstance,
  clearCachedDb,
  createMockDb
};
