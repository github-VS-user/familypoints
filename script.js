import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore(window.app);

let currentUser = null;
let todayStr = new Date().toISOString().slice(0,10); // YYYY-MM-DD
let todayAwarded = 0, todayLost = 0, todayNet = 0, awardedToday = false, rulesBroken = {};

const dailyKeys = [
  "dressed", "bed", "plate", "teeth", "shower", "ipad", "pajamas", "laundry",
  "clothes", "bedtime", "table_manners", "parent", "interrupt", "repeat"
];
const dailyLabels = {
  dressed: "Getting dressed in the morning",
  bed: "Making the bed",
  plate: "Always bringing out the plate after meals",
  teeth: "Brushing your teeth after breakfast and dinner",
  shower: "Showering every other day and tidying up your bathrobe",
  ipad: "Charging your iPad and tidying folders for the next day",
  pajamas: "Putting on your pajamas",
  laundry: "Putting dirty laundry in the hamper",
  clothes: "Laying out clothes for the next day",
  bedtime: "Going to bed on time (reading + lights out)",
  table_manners: "At the table: no singing/dancing/playing with hands, no feet on chairs",
  parent: "Don't act like a parent",
  interrupt: "Don't interrupt while others are talking",
  repeat: "Don't make mom repeat things"
};

function updateDailySummary() {
  document.getElementById("todayAwarded").innerText = `Awarded: ${todayAwarded}`;
  document.getElementById("todayLost").innerText = `Lost: ${todayLost}`;
  document.getElementById("todayNet").innerText = `Net: ${todayNet}`;
}

function updateSummary(data) {
  const weeklyEl = document.getElementById("weeklyTotal");
  const monthlyEl = document.getElementById("monthlyTotal");
  const moneyEl = document.getElementById("moneyTotal");
  const weekly = data.weeklyTotal || 0;
  const monthly = data.monthlyTotal || 0;
  let chf = Math.floor((weekly >= 75 ? 5 : weekly / 15));
  weeklyEl.innerText = `Weekly Points: ${weekly}`;
  monthlyEl.innerText = `Monthly Points: ${monthly}`;
  moneyEl.innerText = `Money Equivalent: ${chf} CHF`;
}

async function loadUser(user) {
  currentUser = user;
  const userRef = doc(db, "users", user);
  let snapshot = await getDoc(userRef);
  let data;
  if (snapshot.exists()) {
    data = snapshot.data();
  } else {
    data = {
      points: 0,
      history: [],
      weeklyTotal: 0,
      monthlyTotal: 0,
      lastDaily: { date: todayStr, completed: {}, awarded: false, rulesBroken: {} }
    };
    await setDoc(userRef, data);
  }
  // Daily reset logic
  if (!data.lastDaily || data.lastDaily.date !== todayStr) {
    data.lastDaily = { date: todayStr, completed: {}, awarded: false, rulesBroken: {} };
    await updateDoc(userRef, { lastDaily: data.lastDaily });
  }
  // Awarded logic
  todayAwarded = data.lastDaily.awarded ? 15 : 0;
  todayLost = Object.keys(data.lastDaily.rulesBroken || {}).length;
  todayNet = todayAwarded - todayLost;
  awardedToday = !!data.lastDaily.awarded;
  rulesBroken = data.lastDaily.rulesBroken || {};
  updateDailySummary();

  document.getElementById("userName").innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
  document.getElementById("currentPoints").innerText = `${data.points || 0} Points`;

  // Checklist
  dailyKeys.forEach(key => {
    const cb = document.getElementById("daily-" + key);
    if (cb) {
      cb.checked = !!data.lastDaily.completed[key];
      cb.disabled = true; // Always disabled for mum, only minus buttons used
    }
    const minusBtn = document.querySelector(`.minus-btn[data-key="${key}"]`);
    if (minusBtn) {
      minusBtn.disabled = !awardedToday || !!rulesBroken[key];
    }
  });

  // History
  const historyList = document.getElementById("history");
  historyList.innerHTML = "";
  (data.history || []).slice().reverse().forEach(item => {
    const li = document.createElement("li");
    li.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
    historyList.appendChild(li);
  });

  document.getElementById("userSection").style.display = "block";
  document.getElementById("defaultMessage").style.display = "none";
  updateSummary(data);
}

async function addPoints(user, points, reason) {
  const userRef = doc(db, "users", user);
  let snapshot = await getDoc(userRef);
  let data = snapshot.exists() ? snapshot.data() : { points: 0, history: [] };
  let weeklyTotal = (data.weeklyTotal || 0);
  let monthlyTotal = (data.monthlyTotal || 0);

  // Weekly max cap
  if (points > 0) {
    if (weeklyTotal + points > 75) {
      points = 75 - weeklyTotal;
      if (points <= 0) points = 0;
    }
    weeklyTotal += points;
    monthlyTotal += points;
  } else {
    weeklyTotal += points;
    monthlyTotal += points;
    if (weeklyTotal < 0) weeklyTotal = 0;
    if (monthlyTotal < 0) monthlyTotal = 0;
  }
  let newPoints = (data.points || 0) + points;
  let newHistoryItem = { time: new Date().toLocaleString(), points, reason };
  await updateDoc(userRef, {
    points: newPoints,
    weeklyTotal,
    monthlyTotal,
    history: arrayUnion(newHistoryItem)
  });
  document.getElementById("currentPoints").innerText = `${newPoints} Points`;
  let historyList = document.getElementById("history");
  if (historyList) {
    let li = document.createElement("li");
    li.innerText = `${newHistoryItem.time} - ${newHistoryItem.points} Points (${newHistoryItem.reason})`;
    historyList.insertBefore(li, historyList.firstChild);
  }
  updateSummary({ weeklyTotal, monthlyTotal });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
  document.getElementById("linda").addEventListener("click", () => loadUser("linda"));

  // Award daily points
  document.getElementById("awardDailyBtn").addEventListener("click", async () => {
    if (!currentUser || awardedToday) return;
    todayAwarded = 15;
    todayLost = 0;
    todayNet = 15;
    awardedToday = true;
    rulesBroken = {};
    updateDailySummary();
    await addPoints(currentUser, 15, "Awarded daily points");
    // Mark awarded in Firestore
    let userRef = doc(db, "users", currentUser);
    let snapshot = await getDoc(userRef);
    let data = snapshot.exists() ? snapshot.data() : {};
    data.lastDaily.awarded = true;
    await updateDoc(userRef, { lastDaily: data.lastDaily });
    // Enable minus buttons
    dailyKeys.forEach(key => {
      let minusBtn = document.querySelector(`.minus-btn[data-key="${key}"]`);
      if (minusBtn) minusBtn.disabled = false;
    });
  });

  // Minus rule broken
  document.querySelectorAll(".minus-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser || !awardedToday) return;
      const key = btn.dataset.key;
      if (rulesBroken[key]) return;
      todayLost += 1;
      todayNet = todayAwarded - todayLost;
      rulesBroken[key] = true;
      updateDailySummary();
      await addPoints(currentUser, -1, `Rule broken: ${dailyLabels[key]}`);
      // Mark as broken in Firestore
      let userRef = doc(db, "users", currentUser);
      let snapshot = await getDoc(userRef);
      let data = snapshot.exists() ? snapshot.data() : {};
      data.lastDaily.rulesBroken[key] = true;
      await updateDoc(userRef, { lastDaily: data.lastDaily });
      btn.disabled = true;
    });
    btn.disabled = true;
  });

  // Bonus buttons
  document.querySelectorAll(".bonus-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) return;
      const points = parseInt(btn.dataset.points);
      const reason = btn.innerText.replace(/\(\+\d+\)/,'').trim();
      await addPoints(currentUser, points, reason);
    });
  });

  // School checklist
  document.querySelectorAll(".school-item").forEach(cb => {
    cb.addEventListener("change", async (e) => {
      if (!currentUser) return;
      const points = e.target.checked ? parseInt(e.target.dataset.points) : -parseInt(e.target.dataset.points);
      const reason = e.target.nextSibling.textContent.trim();
      await addPoints(currentUser, points, reason);
    });
  });

  // History collapsible
  const btn = document.getElementById("toggleHistoryBtn");
  const history = document.getElementById("history");
  if (btn && history) {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", (!expanded).toString());
      btn.textContent = expanded ? "Show Points History" : "Hide Points History";
      history.classList.toggle("collapsed", expanded);
    });
  }

  // Reset all button
  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to reset EVERYTHING for this user?")) return;
    let userRef = doc(db, "users", currentUser);
    await setDoc(userRef, {
      points: 0,
      weeklyTotal: 0,
      monthlyTotal: 0,
      history: [],
      lastDaily: { date: todayStr, completed: {}, awarded: false, rulesBroken: {} }
    });
    loadUser(currentUser);
  });
});
