let customers = [];
let currentCustomer = null;
let selectedTxnDate = new Date();
let liveInterval = null;

/* ELEMENTS */
const homeScreen = document.getElementById("homeScreen");
const customerFormScreen = document.getElementById("customerFormScreen\");
const ledgerScreen = document.getElementById("ledgerScreen\");

const customerList = document.getElementById("customerList\");
const customerCount = document.getElementById("customerCount\");
const totalReceive = document.getElementById("totalReceive\");
const totalGive = document.getElementById("totalGive\");
const searchInput = document.getElementById("searchInput\");

const openCustomerModal = document.getElementById("openCustomerModal\");
const backFromCustomerForm = document.getElementById("backFromCustomerForm\");
const saveCustomerBtn = document.getElementById("saveCustomerBtn\");

const customerFormTitle = document.getElementById("customerFormTitle\");
const customerName = document.getElementById("customerName\");
const customerPhone = document.getElementById("customerPhone\");
const customerOpening = document.getElementById("customerOpening\");
const openingBalContainer = document.getElementById("openingBalContainer\");

const backToHome = document.getElementById("backToHome\");
const ledgerAvatar = document.getElementById("ledgerAvatar\");
const ledgerName = document.getElementById("ledgerName\");
const ledgerBalance = document.getElementById("ledgerBalance\");
const ledgerBalanceLabel = document.getElementById("ledgerBalanceLabel\");

const txnGive = document.getElementById("txnGive\");
const txnReceive = document.getElementById("txnReceive\");
const txnNote = document.getElementById("txnNote\");
const saveTxnBtn = document.getElementById("saveTxnBtn\");
const transactionList = document.getElementById("transactionList\");

const txnDateBtn = document.getElementById("txnDateBtn\");
const txnDate = document.getElementById("txnDate\");

const viewReportBtn = document.getElementById("viewReportBtn\");
const reportViewContainer = document.getElementById("reportViewContainer\");
const closeReportBtn = document.getElementById("closeReportBtn\");
const reportTxnList = document.getElementById("reportTxnList\");
const reportTotalGave = document.getElementById("reportTotalGave\");
const reportTotalGot = document.getElementById("reportTotalGot\");

const deleteCustomerBtn = document.getElementById("deleteCustomerBtn\");

// Live Time Handler
function startLiveTime() {
  const timeEl = document.querySelector(".status-right\");
  if (!timeEl) return;
  
  function update() {
    const now = new Date();
    timeEl.textContent = `(${now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})`;
  }
  update();
  liveInterval = setInterval(update, 1000);
}

/* APP INIT */
document.addEventListener("DOMContentLoaded", async () => {
  updateTxnDateButton();
  await loadDashboard();
});

/* DASHBOARD LOAD */
async function loadDashboard() {
  try {
    const list = await getCustomers() || [];
    customers = list.sort((a, b) => b.createdAt - a.createdAt);
    
    let totalPaboSum = 0;
    let totalDeboSum = 0;

    // প্রতিটি কাস্টমারের ট্রানজেকশন হিসাব করে মোট ড্যাশবোর্ড সামারি বের করা
    for (let c of customers) {
      const txns = await getTransactions(c.id) || [];
      const bal = calcBalance(c, txns);
      if (bal >= 0) {
        totalPaboSum += bal;
      } else {
        totalDeboSum += Math.abs(bal);
      }
    }

    if (customerCount) customerCount.textContent = customers.length;
    if (totalGive) totalGive.textContent = money(totalPaboSum);    // লাল কার্ড (পাবো)
    if (totalReceive) totalReceive.textContent = money(totalDeboSum); // সবুজ কার্ড (দেবো)

    renderCustomerList(customers);
  } catch (err) {
    console.error(err);
  }
}

/* RENDER CUSTOMER LIST (HOME) */
async function renderCustomerList(list) {
  if (!customerList) return;
  customerList.innerHTML = "";

  if (list.length === 0) {
    customerList.innerHTML = `<div class="empty-state">কোনো কাস্টমার পাওয়া যায়নি।</div>`;
    return;
  }

  for (let cust of list) {
    const txns = await getTransactions(cust.id) || [];
    const bal = calcBalance(cust, txns);

    const row = document.createElement("div");
    row.className = "customer-row";
    row.onclick = () => openLedger(cust);

    const firstLetter = cust.name ? cust.name.trim().charAt(0).toUpperCase() : "C";

    // ব্যালেন্স অনুযায়ী লেবেল এবং কালার ক্লাস নির্ধারণ (ড্যাশবোর্ড লিস্টের জন্য)
    let balLabel = "পাবো";
    let balClass = "give"; // লাল রঙ
    if (bal < 0) {
      balLabel = "দেবো";
      balClass = "receive"; // সবুজ রঙ
    }

    row.innerHTML = `
      <div class="user-info">
        <div class="avatar">${firstLetter}</div>
        <div class="user-details">
          <h3>${cust.name}</h3>
          <p>${cust.phone || "ফোন নম্বর নেই"}</p>
        </div>
      </div>
      <div class="user-status text-right">
        <span class="status-tag ${balClass}">${balLabel}</span>
        <h3 class="amount ${balClass}">৳ ${money(Math.abs(bal))}</h3>
      </div>
    `;
    customerList.appendChild(row);
  }
}

/* OPEN INDIVIDUAL LEDGER */
async function openLedger(customer) {
  currentCustomer = customer;
  if (ledgerName) ledgerName.textContent = customer.name;
  if (ledgerAvatar) ledgerAvatar.textContent = customer.name.trim().charAt(0).toUpperCase();

  switchScreen(ledgerScreen);
  startLiveTime();
  await refreshTransactionList();
}

/* REFRESH TXN LIST */
async function refreshTransactionList() {
  if (!currentCustomer || !transactionList) return;
  transactionList.innerHTML = "";

  const txns = await getTransactions(currentCustomer.id) || [];
  const bal = calcBalance(currentCustomer, txns);

  // লেজার স্ক্রিনের টপ ব্যালেন্স লেবেল এবং কালার ফিক্সিং
  if (ledgerBalance) ledgerBalance.textContent = money(Math.abs(bal));
  if (ledgerBalanceLabel) {
    if (bal >= 0) {
      ledgerBalanceLabel.textContent = "পাবো";
      // লেজারের টপ পার্ট লাল করার জন্য এক্সিস্টিং কালার ক্লাস চেঞ্জ বিহেভিয়ার
      const statusBar = document.querySelector(".status-bar");
      if (statusBar) {
        statusBar.style.backgroundColor = "#fff5f5";
        const statusLeft = document.querySelector(".status-left");
        if (statusLeft) statusLeft.style.color = "#b51e23";
      }
      if (ledgerBalance) ledgerBalance.style.color = "#b51e23";
    } else {
      ledgerBalanceLabel.textContent = "দেবো";
      const statusBar = document.querySelector(".status-bar");
      if (statusBar) {
        statusBar.style.backgroundColor = "#f0fff4";
        const statusLeft = document.querySelector(".status-left");
        if (statusLeft) statusLeft.style.color = "#118a4d";
      }
      if (ledgerBalance) ledgerBalance.style.color = "#118a4d";
    }
  }

  const topBalEl = document.getElementById("ledgerTopBalance");
  if (topBalEl) topBalEl.textContent = money(Math.abs(bal));

  if (txns.length === 0) {
    transactionList.innerHTML = `<div class="empty-state">কোনো লেনদেন নেই।</div>`;
    return;
  }

  txns.forEach(txn => {
    const div = document.createElement("div");
    div.className = "transaction-card";

    let amount = 0;
    let cls = "give";
    let label = "লেনদেন";

    if (txn.give > 0) {
      amount = txn.give;
      cls = "give"; // লাল রঙ
      label = "দিলাম/বেচা";
    } else if (txn.receive > 0) {
      amount = txn.receive;
      cls = "receive"; // সবুজ রঙ
      label = "পেলাম";
    }

    const tDate = new Date(txn.createdAt);
    const dateStr = tDate.toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" });
    const timeStr = tDate.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });

    div.innerHTML = `
      <div class="txn-left">
        <span class="txn-badge ${cls}">${label}</span>
        <div class="txn-meta-info">
          <span class="txn-date-text">${dateStr} (${timeStr})</span>
          <p class="txn-note-text">${txn.note || "বিবরণ নেই"}</p>
        </div>
      </div>
      <div class="txn-right">
        <h3 class="txn-amount-val ${cls}">৳ ${money(amount)}</h3>
      </div>
    `;

    // Long Press or Context Menu for Delete
    div.oncontextmenu = async (e) => {
      e.preventDefault();
      if (!confirm("এই লেনদেনটি ডিলিট করতে চান?")) return;
      await deleteTransaction(txn.id);
      await refreshTransactionList();
    };

    transactionList.appendChild(div);
  });
}

/* SAVE TRANSACTION */
if (saveTxnBtn) {
  saveTxnBtn.onclick = async () => {
    if (!currentCustomer) return;

    const giveVal = parseFloat(txnGive.value) || 0;
    const receiveVal = parseFloat(txnReceive.value) || 0;
    const noteVal = txnNote.value.trim();

    if (giveVal === 0 && receiveVal === 0) {
      alert("অনুগ্রহ করে সঠিক টাকা লিখুন");
      return;
    }

    if (giveVal > 0 && receiveVal > 0) {
      alert("একসাথে 'দিলাম' এবং 'পেলাম' ইনপুট দেওয়া যাবে না। যেকোনো একটি দিন।");
      return;
    }

    const timestamp = selectedTxnDate.getTime() + (Date.now() % 86400000);

    const txn = {
      id: Date.now().toString(),
      customerId: currentCustomer.id,
      give: giveVal,
      receive: receiveVal,
      note: noteVal,
      createdAt: timestamp
    };

    await addTransaction(txn);

    txnGive.value = "";
    txnReceive.value = "";
    txnNote.value = "";

    await refreshTransactionList();
  };
}

/* REPORT SCREEN GENERATION */
if (viewReportBtn) {
  viewReportBtn.onclick = async () => {
    if (!currentCustomer || !reportViewContainer) return;

    const txns = await getTransactions(currentCustomer.id) || [];
    if (reportTxnList) reportTxnList.innerHTML = "";

    let totalG = 0;
    let totalR = 0;

    txns.forEach(t => {
      totalG += (t.give || 0);
      totalR += (t.receive || 0);

      const d = new Date(t.createdAt);
      const dStr = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      const tStr = d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });

      const row = document.createElement("div");
      row.className = "report-table-row";

      row.innerHTML = `
        <div class="rep-info-col">
          <div class="rep-date">${dStr}</div>
          <div class="rep-time">${tStr}</div>
          <div class="rep-note">${t.note || "-"}</div>
        </div>
        <div class="rep-gave">${t.give > 0 ? money(t.give) : "-"}</div>
        <div class="rep-got">${t.receive > 0 ? money(t.receive) : "-"}</div>
      `;
      reportTxnList.appendChild(row);
    });

    if (reportTotalGave) reportTotalGave.textContent = money(totalG);
    if (reportTotalGot) reportTotalGot.textContent = money(totalR);

    reportViewContainer.style.display = "flex";
  };
}

if (closeReportBtn) {
  closeReportBtn.onclick = () => {
    if (reportViewContainer) reportViewContainer.style.display = "none";
  };
}

/* CUSTOMER CRUD */
if (openCustomerModal) {
  openCustomerModal.onclick = () => {
    currentCustomer = null;
    if (customerFormTitle) customerFormTitle.textContent = "নতুন কাস্টমার যোগ করুন";
    if (customerName) customerName.value = "";
    if (customerPhone) customerPhone.value = "";
    if (customerOpening) customerOpening.value = "";
    if (openingBalContainer) openingBalContainer.style.display = "block";
    switchScreen(customerFormScreen);
  };
}

if (deleteCustomerBtn) {
  deleteCustomerBtn.onclick = async () => {
    if (!currentCustomer) return;
    if (!confirm(`আপনি কি নিশ্চিতভাবে ${currentCustomer.name} এর সমস্ত ডাটা এবং অ্যাকাউন্ট ডিলিit করতে চান?`)) return;

    const txns = await getTransactions(currentCustomer.id) || [];
    for (let t of txns) {
      await deleteTransaction(t.id);
    }

    await deleteCustomer(currentCustomer.id);
    currentCustomer = null;

    if (liveInterval) clearInterval(liveInterval);
    await loadDashboard();
    switchScreen(homeScreen);
  };
}

if (saveCustomerBtn) {
  saveCustomerBtn.onclick = async () => {
    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    const opening = parseFloat(customerOpening.value) || 0;

    if (!name) {
      alert("কাস্টমারের নাম আবশ্যিক!");
      return;
    }

    if (currentCustomer) {
      currentCustomer.name = name;
      currentCustomer.phone = phone;
      await updateCustomer(currentCustomer);
      await openLedger(currentCustomer);
    } else {
      const newCust = {
        id: Date.now().toString(),
        name: name,
        phone: phone,
        openingBalance: opening,
        createdAt: Date.now()
      };
      await addCustomer(newCust);
      await openLedger(newCust);
    }

    await loadDashboard();
  };
}

/* BACK NAVIGATIONS */
if (backToHome) {
  backToHome.onclick = async () => {
    if (liveInterval) clearInterval(liveInterval);
    await loadDashboard();
    switchScreen(homeScreen);
  };
}

if (backFromCustomerForm) {
  backFromCustomerForm.onclick = async () => {
    if (currentCustomer) {
      switchScreen(ledgerScreen);
    } else {
      await loadDashboard();
      switchScreen(homeScreen);
    }
  };
}

/* LIVE SEARCH */
if (searchInput) {
  searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(q));
    renderCustomerList(filtered);
  };
}

/* UTILS & MATH COMPUTATION */
function switchScreen(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function calcBalance(cust, txns) {
  let bal = cust.openingBalance || 0; // পজিটিভ মানে কাস্টমারের কাছে পাবো, নেগেটিভ মানে কাস্টমারকে দেবো
  if (txns && txns.length > 0) {
    txns.forEach(t => {
      bal += (t.give || 0);
      bal -= (t.receive || 0);
    });
  }
  return bal; 
}

function money(v) {
  let parsed = parseFloat(v);
  if (isNaN(parsed)) return "০.০০";
  return parsed.toFixed(2);
}

function updateTxnDateButton() {
  if (txnDateBtn) {
    txnDateBtn.textContent = "📅 " + selectedTxnDate.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
  }
}

if (txnDateBtn) {
  txnDateBtn.onclick = () => {
    txnDate.value = selectedTxnDate.toISOString().split("T")[0];
    if (txnDate.showPicker) {
      txnDate.showPicker();
    } else {
      txnDate.click();
    }
  };
}

if (txnDate) {
  txnDate.onchange = () => {
    if (txnDate.value) {
      selectedTxnDate = new Date(txnDate.value);
      updateTxnDateButton();
    }
  };
}
