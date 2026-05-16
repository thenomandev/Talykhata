let customers = [];
let currentCustomer = null;
let selectedTxnDate = new Date();
let liveInterval = null;

/* ELEMENTS */
const homeScreen = document.getElementById("homeScreen");
const customerFormScreen = document.getElementById("customerFormScreen\");
const ledgerScreen = document.getElementById("ledgerScreen");

const customerList = document.getElementById("customerList");
const customerCount = document.getElementById("customerCount");
const totalReceive = document.getElementById("totalReceive");
const totalGive = document.getElementById("totalGive");
const searchInput = document.getElementById("searchInput");

const openCustomerModal = document.getElementById("openCustomerModal");
const backFromCustomerForm = document.getElementById("backFromCustomerForm");
const saveCustomerBtn = document.getElementById("saveCustomerBtn");

const customerFormTitle = document.getElementById("customerFormTitle");
const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");
const customerOpening = document.getElementById("customerOpening");
const openingBalContainer = document.getElementById("openingBalContainer");

const backToHome = document.getElementById("backToHome");
const ledgerAvatar = document.getElementById("ledgerAvatar");
const ledgerName = document.getElementById("ledgerName");
const ledgerBalance = document.getElementById("ledgerBalance");
const ledgerBalanceLabel = document.getElementById("ledgerBalanceLabel");
const deleteCustomerBtn = document.getElementById("deleteCustomerBtn");

const txnGive = document.getElementById("txnGive");
const txnReceive = document.getElementById("txnReceive");
const txnNote = document.getElementById("txnNote");
const txnDate = document.getElementById("txnDate");
const txnDateBtn = document.getElementById("txnDateBtn");
const saveTxnBtn = document.getElementById("saveTxnBtn");

const threeDotMenu = document.getElementById("threeDotMenu");
const btnViewReport = document.getElementById("btnViewReport");
const btnEditCustomer = document.getElementById("btnEditCustomer");
const reportViewContainer = document.getElementById("reportViewContainer");
const closeReportBtn = document.getElementById("closeReportBtn");
const reportTxnList = document.getElementById("reportTxnList");
const reportTotalGave = document.getElementById("reportTotalGave");
const reportTotalGot = document.getElementById("reportTotalGot");

/* INITIAL LOAD */
document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();
  updateTxnDateButton();
  
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
  }
});

/* CORE DASHBOARD LOAD */
async function loadDashboard() {
  const all = await getAllCustomers();
  customers = all;

  for (let c of customers) {
    const txns = await getTransactions(c.id);
    c.computedBalance = calcBalance(c, txns);
  }

  renderCustomerList(customers);
  updateSummary();
}

/* RENDER HOME CUSTOMER LIST */
function renderCustomerList(list) {
  customerList.innerHTML = "";
  customerCount.textContent = list.length;

  if (list.length === 0) {
    customerList.innerHTML = `<div style="text-align:center; padding: 40px; color: #777;">কোনো গ্রাহক পাওয়া যায়নি</div>`;
    return;
  }

  list.forEach(cust => {
    const div = document.createElement("div");
    div.className = "customer-item";
    
    const bal = cust.computedBalance || 0;
    let balText = "৳ ০.০০";
    let balClass = "";
    
    // অ্যানালিসিস অনুযায়ী ফিক্সড: bal > 0 মানে দিলাম বেশি -> পাবো (লাল)
    // bal < 0 মানে পেলাম বেশি -> দেবো (সবুজ)
    if (bal > 0) {
      balText = `পাবো ৳ ${money(bal)}`;
      balClass = "give"; 
    } else if (bal < 0) {
      balText = `দেবো ৳ ${money(Math.abs(bal))}`;
      balClass = "receive"; 
    }

    div.innerHTML = `
      <div class="cust-left">
        <div class="avatar">${cust.name.charAt(0).toUpperCase()}</div>
        <div>
          <div class="cust-name">${cust.name}</div>
          <div class="cust-time">সক্রিয় হিসাব</div>
        </div>
      </div>
      <div class="cust-right ${balClass}">${balText}</div>
    `;

    div.onclick = () => openLedger(cust);
    customerList.appendChild(div);
  });
}

/* DASHBOARD SUMMARY CALCULATOR */
function updateSummary() {
  let rec = 0;
  let giv = 0;
  customers.forEach(c => {
    const b = c.computedBalance || 0;
    // bal > 0 মানে পাবো (লাল)
    if (b > 0) rec += b;
    // bal < 0 মানে দেবো (সবুজ)
    if (b < 0) giv += Math.abs(b);
  });
  totalReceive.textContent = `৳ ${money(rec)}`;
  totalGive.textContent = `৳ ${money(giv)}`;
}

/* LEDGER DETAILS VIEW */
async function openLedger(customer) {
  currentCustomer = customer;
  switchScreen(ledgerScreen);
  
  ledgerName.textContent = customer.name;
  ledgerAvatar.textContent = customer.name.charAt(0).toUpperCase();
  
  if (threeDotMenu) threeDotMenu.classList.remove("active");
  if (reportViewContainer) reportViewContainer.style.display = "none";
  
  const txns = await getTransactions(customer.id);
  startLiveTimer(customer, txns);
  
  const bal = calcBalance(customer, txns);
  currentCustomer.computedBalance = bal;

  const statusBar = document.querySelector(".status-bar");

  // হোম স্ক্রিনের সাথে সেম বিহেভিয়ার কন্ডিশন (পাবো = লাল, দেবো = সবুজ)
  if (bal >= 0) {
    if (ledgerBalanceLabel) ledgerBalanceLabel.textContent = "পাবো ৳ ";
    ledgerBalance.textContent = money(bal);
    
    if (statusBar) {
      statusBar.style.backgroundColor = "#fff5f5"; // হালকা লাল ব্যাকগ্রাউন্ড
      if (ledgerBalanceLabel) ledgerBalanceLabel.parentElement.style.color = "#c8102e"; // লাল টেক্সট
    }
  } else {
    if (ledgerBalanceLabel) ledgerBalanceLabel.textContent = "দেবো ৳ ";
    ledgerBalance.textContent = money(Math.abs(bal));
    
    if (statusBar) {
      statusBar.style.backgroundColor = "#f0fdf4"; // হালকা সবুজ ব্যাকগ্রাউন্ড
      if (ledgerBalanceLabel) ledgerBalanceLabel.parentElement.style.color = "#118a4d"; // সবুজ টেক্সট
    }
  }

  // Transaction History List Render
  const transactionList = document.getElementById("transactionList");
  if (transactionList) {
    transactionList.innerHTML = "";
    txns.forEach(txn => {
      const div = document.createElement("div");
      div.className = "transaction-item";
      
      const amount = txn.give > 0 ? txn.give : txn.receive;
      
      // দিলাম = লাল (give), পেলাম = সবুজ (receive)
      const cls = txn.give > 0 ? "give" : "receive";
      const label = txn.give > 0 ? "দিলাম" : "পেলাম";

      div.innerHTML = `
        <div class="txn-note">${txn.note || "লেনদেন"}</div>
        <div class="txn-amount ${cls}">${label}: ৳ ${money(amount)}</div>
      `;

      div.oncontextmenu = async (e) => {
        e.preventDefault();
        if (confirm("এই লেনদেনটি ডিলিট করতে চান?")) {
          await deleteTransaction(txn.id);
          await loadDashboard();
          const updated = customers.find(c => c.id === currentCustomer.id);
          if (updated) openLedger(updated);
        }
      };
      transactionList.appendChild(div);
    });
  }

  // Report Sheet Build
  if (reportTxnList) {
    reportTxnList.innerHTML = "";
    let totalGaveSum = 0;
    let totalGotSum = 0;

    if (customer.openingBalance && customer.openingBalance !== 0) {
      const row = document.createElement("div");
      row.className = "report-row";
      const opDate = new Date(customer.createdAt || Date.now());
      
      let gaveVal = customer.openingBalance > 0 ? customer.openingBalance : 0;
      let gotVal = customer.openingBalance < 0 ? Math.abs(customer.openingBalance) : 0;
      totalGaveSum += gaveVal;
      totalGotSum += gotVal;

      row.innerHTML = `
        <div class="rep-details">
          <div class="rep-date">${formatDateBangla(opDate)}</div>
          <div class="rep-time">${formatTimeBangla(opDate)}</div>
          <div class="rep-note">শুরুর ব্যালেন্স</div>
        </div>
        <div class="rep-gave">${gaveVal > 0 ? money(gaveVal) : ""}</div>
        <div class="rep-got">${gotVal > 0 ? money(gotVal) : ""}</div>
      `;
      reportTxnList.appendChild(row);
    }

    const reversedTxns = [...txns].reverse();
    reversedTxns.forEach(txn => {
      const row = document.createElement("div");
      row.className = "report-row";
      const tDate = new Date(txn.createdAt);

      if (txn.give > 0) totalGaveSum += txn.give;
      if (txn.receive > 0) totalGotSum += txn.receive;

      row.innerHTML = `
        <div class="rep-details">
          <div class="rep-date">${formatDateBangla(tDate)}</div>
          <div class="rep-time">${formatTimeBangla(tDate)}</div>
          <div class="rep-note">${txn.note || "লেনদেন"}</div>
        </div>
        <div class="rep-gave">${txn.give > 0 ? money(txn.give) : ""}</div>
        <div class="rep-got">${txn.receive > 0 ? money(txn.receive) : ""}</div>
      `;
      reportTxnList.appendChild(row);
    });

    if (reportTotalGave) reportTotalGave.textContent = money(totalGaveSum);
    if (reportTotalGot) reportTotalGot.textContent = money(totalGotSum);
  }
}

/* LIVE RELATIVE TIME CLOCK TIMER */
function startLiveTimer(cust, txns) {
  if (liveInterval) clearInterval(liveInterval);
  
  const rightStatus = document.querySelector(".status-right");
  if (!rightStatus) return;

  function update() {
    let lastTime = cust.createdAt || Date.now();
    if (txns && txns.length > 0) {
      lastTime = txns[0].createdAt; 
    }
    const diffMs = Date.now() - lastTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      rightStatus.textContent = "(এইমাত্র)";
    } else if (diffMins < 60) {
      rightStatus.textContent = `(${numbersToBangla(diffMins)} মিনিট আগে)`;
    } else {
      const hours = Math.floor(diffMins / 60);
      if (hours < 24) {
        rightStatus.textContent = `(${numbersToBangla(hours)} ঘণ্টা আগে)`;
      } else {
        const days = Math.floor(hours / 24);
        rightStatus.textContent = `(${numbersToBangla(days)} দিন আগে)`;
      }
    }
  }

  update();
  liveInterval = setInterval(update, 30000);
}

/* BANGLA UTILS CONSTANTS & HELPERS */
function numbersToBangla(num) {
  const eng = ["0","1","2","3","4","5","6","7","8","9"];
  const bng = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  return num.toString().split("").map(char => {
    const idx = eng.indexOf(char);
    return idx !== -1 ? bng[idx] : char;
  }).join("");
}

function formatDateBangla(dateObj) {
  const months = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
  const day = dateObj.getDate();
  const monthStr = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${numbersToBangla(day)} ${monthStr} ${numbersToBangla(year)}`;
}

function formatTimeBangla(dateObj) {
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "পিএম" : "এএম";
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const minStr = minutes < 10 ? "0" + minutes : minutes;
  return `${numbersToBangla(hours)}:${numbersToBangla(minStr)} ${ampm}`;
}

/* SAVE TRANSACTION EVENT */
if (saveTxnBtn) {
  saveTxnBtn.onclick = async () => {
    if (!currentCustomer) return;
    
    const giveVal = parseFloat(txnGive.value) || 0;
    const receiveVal = parseFloat(txnReceive.value) || 0;
    const noteVal = txnNote.value.trim();

    if (giveVal === 0 && receiveVal === 0) {
      alert("দয়া করে পরিমাণ ইনপুট দিন");
      return;
    }

    const tDate = new Date(txnDate.value || selectedTxnDate);
    tDate.setHours(new Date().getHours());
    tDate.setMinutes(new Date().getMinutes());
    tDate.setSeconds(new Date().getSeconds());

    const newTxn = {
      id: Date.now().toString(),
      customerId: currentCustomer.id,
      give: giveVal,
      receive: receiveVal,
      note: noteVal,
      createdAt: tDate.getTime()
    };

    await addTransaction(newTxn);
    
    txnGive.value = "";
    txnReceive.value = "";
    txnNote.value = "";
    selectedTxnDate = new Date();
    updateTxnDateButton();

    const allTxns = await getTransactions(currentCustomer.id);
    currentCustomer.computedBalance = calcBalance(currentCustomer, allTxns);
    openLedger(currentCustomer);
  };
}

/* THREE DOT DROPDOWN POPUP CONTROLS */
if (deleteCustomerBtn) {
  deleteCustomerBtn.onclick = (e) => {
    e.stopPropagation();
    if (threeDotMenu) threeDotMenu.classList.toggle("active");
  };
}

document.addEventListener("click", () => {
  if (threeDotMenu) threeDotMenu.classList.remove("active");
});

if (btnViewReport) {
  btnViewReport.onclick = () => {
    if (reportViewContainer) reportViewContainer.style.display = "flex";
    if (threeDotMenu) threeDotMenu.classList.remove("active");
  };
}

if (closeReportBtn) {
  closeReportBtn.onclick = () => {
    if (reportViewContainer) reportViewContainer.style.display = "none";
  };
}

if (btnEditCustomer) {
  btnEditCustomer.onclick = () => {
    if (!currentCustomer) return;
    if (threeDotMenu) threeDotMenu.classList.remove("active");

    if (customerFormTitle) customerFormTitle.textContent = "গ্রাহক তথ্য পরিবর্তন";
    if (openingBalContainer) openingBalContainer.style.display = "none";

    customerName.value = currentCustomer.name;
    customerPhone.value = currentCustomer.phone || "";
    customerOpening.value = currentCustomer.openingBalance || 0;

    switchScreen(customerFormScreen);
  };
}

/* ADD & EDIT CUSTOMER TRIGGER ACTIONS */
if (openCustomerModal) {
  openCustomerModal.onclick = () => {
    currentCustomer = null;
    if (customerFormTitle) customerFormTitle.textContent = "নতুন গ্রাহক যোগ করুন";
    if (openingBalContainer) openingBalContainer.style.display = "block";

    customerName.value = "";
    customerPhone.value = "";
    customerOpening.value = "";

    switchScreen(customerFormScreen);
  };
}

if (saveCustomerBtn) {
  saveCustomerBtn.onclick = async () => {
    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    const opening = parseFloat(customerOpening.value) || 0;

    if (!name) {
      alert("গ্রাহকের নাম আবশ্যক");
      return;
    }

    if (currentCustomer) {
      currentCustomer.name = name;
      currentCustomer.phone = phone;
      await updateCustomer(currentCustomer);
      
      const txns = await getTransactions(currentCustomer.id);
      currentCustomer.computedBalance = calcBalance(currentCustomer, txns);
      openLedger(currentCustomer);
    } else {
      const newCust = {
        id: Date.now().toString(),
        name: name,
        phone: phone,
        openingBalance: opening,
        createdAt: Date.now()
      };
      await addCustomer(newCust);
      
      const txns = await getTransactions(newCust.id);
      newCust.computedBalance = calcBalance(newCust, txns);
      openLedger(newCust);
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
  let bal = cust.openingBalance || 0;
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
    txnDateBtn.textContent = "📅 " + selectedTxnDate.toLocaleDateString(\"bn-BD\", { day: \"numeric\", month: \"short\" });
  }
}

if (txnDateBtn) {
  txnDateBtn.onclick = () => {
    if (txnDate) {
      txnDate.value = selectedTxnDate.toISOString().split("T")[0];
      if (txnDate.showPicker) {
        txnDate.showPicker();
      } else {
        txnDate.click();
      }
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
