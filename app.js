let customers = [];
let currentCustomer = null;
let selectedTxnDate = new Date();
let liveInterval = null;

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
const ledgerTopBalance = document.getElementById("ledgerTopBalance");
const deleteCustomerBtn = document.getElementById("deleteCustomerBtn");

const threeDotMenu = document.getElementById("threeDotMenu");
const optTagada = document.getElementById("optTagada");
const optReport = document.getElementById("optReport");
const optEdit = document.getElementById("optEdit");
const optDelete = document.getElementById("optDelete");

const txnGive = document.getElementById("txnGive");
const txnReceive = document.getElementById("txnReceive");
const txnNote = document.getElementById("txnNote");
const txnDateBtn = document.getElementById("txnDateBtn");
const txnDate = document.getElementById("txnDate");
const saveTxnBtn = document.getElementById("saveTxnBtn");

const liveTimeCounter = document.getElementById("liveTimeCounter");
const reportViewContainer = document.getElementById("reportViewContainer");
const closeReportBtn = document.getElementById("closeReportBtn");
const reportTxnList = document.getElementById("reportTxnList");
const reportTotalGave = document.getElementById("reportTotalGave");
const reportTotalGot = document.getElementById("reportTotalGot");

/* INITIALIZE */
window.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();
});

async function loadDashboard() {
  customers = await getAllCustomers();
  
  // প্রতিটি কাস্টমারের লেনদেনসহ ব্যালেন্স লোড করার লুপ
  for (let i = 0; i < customers.length; i++) {
    const txns = await getTransactions(customers[i].id);
    customers[i].computedBalance = calcBalance(customers[i], txns);
  }
  
  renderCustomerList(customers);
  updateSummary();
}

/* RENDER CUSTOMERS */
function renderCustomerList(list) {
  customerList.innerHTML = "";
  customerCount.textContent = list.length;

  list.forEach(cust => {
    const div = document.createElement("div");
    div.className = "customer-item";
    
    const bal = cust.computedBalance || 0;
    let balText = "৳ ০.০০";
    let balClass = "";
    
    if (bal > 0) {
      balText = `পাবো ৳ ${money(bal)}`;
      balClass = "receive";
    } else if (bal < 0) {
      balText = `দেবো ৳ ${money(Math.abs(bal))}`;
      balClass = "give";
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

/* UPDATE SUMMARY */
function updateSummary() {
  let rec = 0;
  let giv = 0;
  customers.forEach(c => {
    const b = c.computedBalance || 0;
    if (b > 0) rec += b;
    if (b < 0) giv += Math.abs(b);
  });
  totalReceive.textContent = `৳ ${money(rec)}`;
  totalGive.textContent = `৳ ${money(giv)}`;
}

/* DYNAMIC LIVE TIME COUNTER */
function startLiveTimer(cust, txns) {
  if (liveInterval) clearInterval(liveInterval);
  
  function updateTime() {
    let referenceTime = cust.createdAt || Date.now();
    if (txns && txns.length > 0) {
      referenceTime = txns[0].createdAt; 
    }
    
    const diffMs = Date.now() - referenceTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      liveTimeCounter.textContent = "(এইমাত্র)";
    } else if (diffMins < 60) {
      liveTimeCounter.textContent = `(${formatBanglaNumber(diffMins)} মিনিট আগে)`;
    } else if (diffHours < 24) {
      liveTimeCounter.textContent = `(${formatBanglaNumber(diffHours)} ঘণ্টা আগে)`;
    } else {
      liveTimeCounter.textContent = `(${formatBanglaNumber(diffDays)} দিন আগে)`;
    }
  }
  
  updateTime();
  liveInterval = setInterval(updateTime, 30000); 
}

function formatBanglaNumber(num) {
  const englishToBangla = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
  return String(num).split('').map(digit => englishToBangla[digit] || digit).join('');
}

/* LEDGER VIEW */
async function openLedger(customer) {
  currentCustomer = customer;
  switchScreen(ledgerScreen);
  
  ledgerName.textContent = customer.name;
  ledgerAvatar.textContent = customer.name.charAt(0).toUpperCase();
  
  threeDotMenu.classList.remove("active");
  reportViewContainer.style.display = "none";
  
  const txns = await getTransactions(customer.id);
  startLiveTimer(customer, txns);
  
  const bal = calcBalance(customer, txns);
  currentCustomer.computedBalance = bal;

  if (bal >= 0) {
    ledgerBalanceLabel.textContent = "পাবো";
    ledgerBalance.textContent = money(bal);
    ledgerTopBalance.textContent = money(bal);
  } else {
    ledgerBalanceLabel.textContent = "দেবো";
    ledgerBalance.textContent = money(Math.abs(bal));
    ledgerTopBalance.textContent = money(Math.abs(bal));
  }

  // রিপোর্ট ভিউ এন্ট্রি লিস্ট জেনারেট
  reportTxnList.innerHTML = "";
  let totalGaveSum = 0;
  let totalGotSum = 0;

  if (customer.openingBalance && customer.openingBalance !== 0) {
    const row = document.createElement("div");
    row.className = "report-row";
    const opDate = new Date(customer.createdAt || Date.now());
    
    let gaveVal = 0;
    let gotVal = 0;
    if (customer.openingBalance > 0) {
      gaveVal = customer.openingBalance;
      totalGaveSum += gaveVal;
    } else {
      gotVal = Math.abs(customer.openingBalance);
      totalGotSum += gotVal;
    }

    row.innerHTML = `
      <div class="rep-details">
        <div class="rep-date">${formatDateBangle(opDate)}</div>
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
        <div class="rep-date">${formatDateBangle(tDate)}</div>
        <div class="rep-time">${formatTimeBangla(tDate)}</div>
        <div class="rep-note">${txn.note || "লেনদেন"}</div>
        <div class="rep-tag">ব্যালেন্স: ৳ ${money(Math.abs(bal))}</div>
      </div>
      <div class="rep-gave">${txn.give > 0 ? money(txn.give) : ""}</div>
      <div class="rep-got">${txn.receive > 0 ? money(txn.receive) : ""}</div>
    `;
    
    row.ondblclick = async () => {
      if (confirm("এই লেনদেনটি ডিলিট করতে চান?")) {
        await deleteTransaction(txn.id);
        await openLedger(currentCustomer);
        await loadDashboard();
      }
    };
    
    reportTxnList.appendChild(row);
  });

  reportTotalGave.textContent = money(totalGaveSum);
  reportTotalGot.textContent = money(totalGotSum);
}

function formatDateBangle(dateObj) {
  return dateObj.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimeBangla(dateObj) {
  return dateObj.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* 3-DOT POPUP MENU */
deleteCustomerBtn.onclick = (e) => {
  e.stopPropagation();
  threeDotMenu.classList.toggle("active");
};

document.onclick = () => {
  threeDotMenu.classList.remove("active");
};

optTagada.onclick = () => {
  alert(`"${currentCustomer.name}" এর মোবাইলে তাগাদা মেসেজ পাঠানো হয়েছে!`);
};

optReport.onclick = () => {
  reportViewContainer.style.display = "flex";
};
closeReportBtn.onclick = () => {
  reportViewContainer.style.display = "none";
};

optEdit.onclick = () => {
  customerFormTitle.textContent = "গ্রাহক তথ্য এডিট করুন";
  customerName.value = currentCustomer.name;
  customerPhone.value = currentCustomer.phone || "";
  openingBalContainer.style.display = "none"; 
  switchScreen(customerFormScreen);
};

optDelete.onclick = async () => {
  if (confirm(`আপনি কি নিশ্চিতভাবে "${currentCustomer.name}" কে সম্পূর্ণ ডিলিট করতে চান?`)) {
    if (liveInterval) clearInterval(liveInterval);
    await deleteCustomer(currentCustomer.id);
    currentCustomer = null;
    await loadDashboard();
    switchScreen(homeScreen);
  }
};

/* SAVE TRANSACTION */
saveTxnBtn.onclick = async () => {
  const giveVal = parseFloat(txnGive.value) || 0;
  const recVal = parseFloat(txnReceive.value) || 0;
  const noteVal = txnNote.value.trim();

  if (giveVal === 0 && recVal === 0) {
    alert("অনুগ্রহ করে সঠিক অংক লিখুন!");
    return;
  }

  const newTxn = {
    id: Date.now().toString(),
    customerId: currentCustomer.id,
    give: giveVal,
    receive: recVal,
    note: noteVal,
    createdAt: selectedTxnDate.getTime()
  };

  await addTransaction(newTxn);
  
  txnGive.value = "";
  txnReceive.value = "";
  txnNote.value = "";
  selectedTxnDate = new Date();
  updateTxnDateButton();

  // ডাটাবেজ রিলোড করে লেজার ও ড্যাশবোর্ড দুইটাই আপডেট রাখা
  await loadDashboard();
  
  // কারেন্ট অবজেক্টকে লিস্ট থেকে রি-ম্যাপ করা যাতে ওল্ড রেফারেন্স না থাকে
  const updatedCust = customers.find(c => c.id === currentCustomer.id);
  if (updatedCust) {
    await openLedger(updatedCust);
  }
};

/* NEW CUSTOMER / EDIT CUSTOMER SAVE */
saveCustomerBtn.onclick = async () => {
  const name = customerName.value.trim();
  const phone = customerPhone.value.trim();
  const opening = parseFloat(customerOpening.value) || 0;

  if (!name) {
    alert("নাম আবশ্যক!");
    return;
  }

  if (customerFormTitle.textContent === "গ্রাহক তথ্য এডিট করুন") {
    currentCustomer.name = name;
    currentCustomer.phone = phone;
    await updateCustomer(currentCustomer);
    
    // ডাটা ড্যাশবোর্ডে সিঙ্ক করা
    await loadDashboard();
    const updatedCust = customers.find(c => c.id === currentCustomer.id);
    await openLedger(updatedCust || currentCustomer);
  } else {
    const newCust = {
      id: Date.now().toString(),
      name: name,
      phone: phone,
      openingBalance: opening,
      createdAt: Date.now()
    };
    await addCustomer(newCust);
    
    // ড্যাশবোর্ডের ডাটাবেজ অ্যারে সম্পূর্ণ রিলোড নিশ্চিত করা
    await loadDashboard();
    
    // নতুন তৈরি হওয়া কাস্টমার অবজেক্টটি অ্যারে থেকে খুঁজে বের করে লেজারে পাঠানো
    const savedCust = customers.find(c => c.id === newCust.id);
    await openLedger(savedCust || newCust);
  }
};

openCustomerModal.onclick = () => {
  customerFormTitle.textContent = "নতুন গ্রাহক যোগ করুন";
  customerName.value = "";
  customerPhone.value = "";
  customerOpening.value = "";
  openingBalContainer.style.display = "block";
  switchScreen(customerFormScreen);
};

/* BACK NAVIGATIONS */
backToHome.onclick = async () => {
  if (liveInterval) clearInterval(liveInterval);
  await loadDashboard(); // হোম স্ক্রিনে ফেরার সময় লেটেস্ট ডাটা নিশ্চিত করা
  switchScreen(homeScreen);
};

backFromCustomerForm.onclick = async () => {
  if (currentCustomer) {
    switchScreen(ledgerScreen);
  } else {
    await loadDashboard();
    switchScreen(homeScreen);
  }
};

/* SEARCH */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  const filtered = customers.filter(c => c.name.toLowerCase().includes(q));
  renderCustomerList(filtered);
};

/* UTILS */
function switchScreen(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function calcBalance(cust, txns) {
  let bal = cust.openingBalance || 0;
  if (txns) {
    txns.forEach(t => {
      bal += (t.give || 0);
      bal -= (t.receive || 0);
    });
  }
  return bal; 
}

function money(v) {
  return v.toFixed(2);
}

function updateTxnDateButton() {
  txnDateBtn.textContent = "📅 " + selectedTxnDate.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
}

txnDateBtn.onclick = () => {
  txnDate.value = selectedTxnDate.toISOString().split("T")[0];
  if (txnDate.showPicker) txnDate.showPicker();
};

txnDate.onchange = () => {
  if (txnDate.value) {
    selectedTxnDate = new Date(txnDate.value);
    updateTxnDateButton();
  }
};
