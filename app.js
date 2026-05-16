let customers = [];
let currentCustomer = null;

/* ELEMENTS */
const homeScreen = document.getElementById("homeScreen");
const customerFormScreen = document.getElementById("customerFormScreen");
const ledgerScreen = document.getElementById("ledgerScreen");

const customerList = document.getElementById("customerList");
const customerCount = document.getElementById("customerCount");
const totalReceive = document.getElementById("totalReceive");
const totalGive = document.getElementById("totalGive");
const searchInput = document.getElementById("searchInput");

const openCustomerModal = document.getElementById("openCustomerModal");
const backFromCustomerForm = document.getElementById("backFromCustomerForm");
const saveCustomerBtn = document.getElementById("saveCustomerBtn");

const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");
const customerOpening = document.getElementById("customerOpening");

const backToHome = document.getElementById("backToHome");
const ledgerAvatar = document.getElementById("ledgerAvatar");
const ledgerName = document.getElementById("ledgerName");
const ledgerBalance = document.getElementById("ledgerBalance");
const ledgerTopBalance = document.getElementById("ledgerTopBalance");
const deleteCustomerBtn = document.getElementById("deleteCustomerBtn");

const txnGive = document.getElementById("txnGive");
const txnReceive = document.getElementById("txnReceive");
const txnNote = document.getElementById("txnNote");
const saveTxnBtn = document.getElementById("saveTxnBtn");
const transactionList = document.getElementById("transactionList");

/* HELPERS */
function showScreen(screen) {
  homeScreen.classList.remove("active");
  customerFormScreen.classList.remove("active");
  ledgerScreen.classList.remove("active");
  screen.classList.add("active");
}

function money(n) {
  return Number(n || 0).toLocaleString("bn-BD");
}

function calcBalance(customer) {
  return Number(customer.balance || 0);
}

/* DASHBOARD */
async function loadCustomers() {
  customers = await getCustomers();
  renderCustomers(customers);
  updateDashboard();
}

function updateDashboard() {
  let receive = 0;
  let give = 0;

  customers.forEach(c => {
    const bal = calcBalance(c);

    if (bal >= 0) {
      receive += bal;
    } else {
      give += Math.abs(bal);
    }
  });

  totalReceive.textContent = money(receive);
  totalGive.textContent = money(give);
  customerCount.textContent = customers.length;
}

function renderCustomers(list) {
  if (!list.length) {
    customerList.innerHTML = `
      <div class="txn-item">
        <div class="txn-note">কোনো কাস্টমার নেই</div>
      </div>
    `;
    return;
  }

  customerList.innerHTML = "";

  list.forEach(customer => {
    const div = document.createElement("div");
    div.className = "customer-item";

    const bal = calcBalance(customer);
    const cls = bal >= 0 ? "give" : "receive";

    div.innerHTML = `
      <div class="customer-left">
        <div class="avatar">
          ${customer.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-time">
            ${customer.phone || ""}
          </div>
        </div>
      </div>

      <div class="customer-balance ${cls}">
        ${money(Math.abs(bal))}
      </div>
    `;

    div.onclick = () => openLedger(customer);

    customerList.appendChild(div);
  });
}

/* CUSTOMER ADD */
openCustomerModal.onclick = () => {
  customerName.value = "";
  customerPhone.value = "";
  customerOpening.value = "";
  showScreen(customerFormScreen);
};

backFromCustomerForm.onclick = () => {
  showScreen(homeScreen);
};

saveCustomerBtn.onclick = async () => {
  const name = customerName.value.trim();

  if (!name) {
    alert("নাম দিন");
    return;
  }

  const customer = {
    id: Date.now().toString(),
    name,
    phone: customerPhone.value.trim(),
    balance: Number(customerOpening.value || 0),
    createdAt: Date.now()
  };

  await addCustomer(customer);
  await loadCustomers();
  showScreen(homeScreen);
};

/* SEARCH */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone || "").includes(q)
  );

  renderCustomers(filtered);
};

/* LEDGER */
async function openLedger(customer) {
  currentCustomer = customer;

  ledgerAvatar.textContent = customer.name.charAt(0).toUpperCase();
  ledgerName.textContent = customer.name;

  const bal = calcBalance(customer);

  ledgerBalance.textContent = money(Math.abs(bal));
  ledgerTopBalance.textContent = money(Math.abs(bal));

  await loadTransactions();

  txnGive.value = "";
  txnReceive.value = "";
  txnNote.value = "";

  showScreen(ledgerScreen);
}

backToHome.onclick = async () => {
  await loadCustomers();
  showScreen(homeScreen);
};

/* DELETE CUSTOMER */
deleteCustomerBtn.onclick = async () => {
  if (!currentCustomer) return;

  if (!confirm("কাস্টমার delete করবেন?")) return;

  await deleteCustomer(currentCustomer.id);
  currentCustomer = null;

  await loadCustomers();
  showScreen(homeScreen);
};

/* TRANSACTIONS */
saveTxnBtn.onclick = async () => {
  if (!currentCustomer) return;

  const give = Number(txnGive.value || 0);
  const receive = Number(txnReceive.value || 0);

  if (!give && !receive) {
    alert("টাকার পরিমাণ দিন");
    return;
  }

  const net = give - receive;

  const txn = {
    id: Date.now().toString(),
    customerId: currentCustomer.id,
    give,
    receive,
    note: txnNote.value.trim(),
    createdAt: Date.now()
  };

  await addTransaction(txn);

  currentCustomer.balance =
    Number(currentCustomer.balance || 0) + net;

  await updateCustomer(currentCustomer);

  txnGive.value = "";
  txnReceive.value = "";
  txnNote.value = "";

  await loadTransactions();
  await loadCustomers();
};

async function loadTransactions() {
  if (!currentCustomer) return;

  const txns = await getTransactions(currentCustomer.id);

  transactionList.innerHTML = "";

  if (!txns.length) {
    transactionList.innerHTML = `
      <div class="txn-item">
        <div class="txn-note">কোনো লেনদেন নেই</div>
      </div>
    `;
  }

  txns.forEach(txn => {
    const div = document.createElement("div");
    div.className = "txn-item";

    const amount = txn.give > 0 ? txn.give : txn.receive;
    const cls = txn.give > 0 ? "give" : "receive";
    const label = txn.give > 0 ? "দিলাম" : "পেলাম";

    div.innerHTML = `
      <div class="txn-note">
        ${txn.note || "লেনদেন"}
      </div>

      <div class="txn-amount ${cls}">
        ${label}: ${money(amount)}
      </div>
    `;

    div.oncontextmenu = async (e) => {
      e.preventDefault();

      if (!confirm("এই লেনদেন delete করবেন?")) return;

      if (txn.give > 0) {
        currentCustomer.balance -= txn.give;
      }

      if (txn.receive > 0) {
        currentCustomer.balance += txn.receive;
      }

      await updateCustomer(currentCustomer);
      await deleteTransaction(txn.id);

      await openLedger(currentCustomer);
    };

    transactionList.appendChild(div);
  });

  const bal = calcBalance(currentCustomer);

  ledgerBalance.textContent = money(Math.abs(bal));
  ledgerTopBalance.textContent = money(Math.abs(bal));
}

/* INIT */
loadCustomers();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}