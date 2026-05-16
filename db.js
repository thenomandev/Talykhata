const DB_NAME = "tallykhata_clone_db";
const DB_VERSION = 1;
const CUSTOMER_STORE = "customers";
const TXN_STORE = "transactions";

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;

      if (!database.objectStoreNames.contains(CUSTOMER_STORE)) {
        const customerStore = database.createObjectStore(CUSTOMER_STORE, {
          keyPath: "id"
        });

        customerStore.createIndex("name", "name", { unique: false });
      }

      if (!database.objectStoreNames.contains(TXN_STORE)) {
        const txnStore = database.createObjectStore(TXN_STORE, {
          keyPath: "id"
        });

        txnStore.createIndex("customerId", "customerId", { unique: false });
        txnStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

/* CUSTOMER */

async function addCustomer(customer) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(CUSTOMER_STORE, "readwrite");
    tx.objectStore(CUSTOMER_STORE).add(customer);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getCustomers() {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(CUSTOMER_STORE, "readonly");
    const req = tx.objectStore(CUSTOMER_STORE).getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function updateCustomer(customer) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(CUSTOMER_STORE, "readwrite");
    tx.objectStore(CUSTOMER_STORE).put(customer);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteCustomer(customerId) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      [CUSTOMER_STORE, TXN_STORE],
      "readwrite"
    );

    tx.objectStore(CUSTOMER_STORE).delete(customerId);

    const txnStore = tx.objectStore(TXN_STORE);
    const index = txnStore.index("customerId");
    const req = index.openCursor(IDBKeyRange.only(customerId));

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* TRANSACTION */

async function addTransaction(transaction) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(TXN_STORE, "readwrite");
    tx.objectStore(TXN_STORE).add(transaction);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getTransactions(customerId) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(TXN_STORE, "readonly");
    const store = tx.objectStore(TXN_STORE);
    const index = store.index("customerId");
    const req = index.getAll(IDBKeyRange.only(customerId));

    req.onsuccess = () => {
      const list = req.result || [];

      list.sort((a, b) => b.createdAt - a.createdAt);

      resolve(list);
    };

    req.onerror = () => reject(req.error);
  });
}

async function updateTransaction(transaction) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(TXN_STORE, "readwrite");
    tx.objectStore(TXN_STORE).put(transaction);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteTransaction(transactionId) {
  const database = await openDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(TXN_STORE, "readwrite");
    tx.objectStore(TXN_STORE).delete(transactionId);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}