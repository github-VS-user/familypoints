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
let lostPointsThisWeek = 0, recoveredPointsThisWeek = 0;
let lastShowerDate = null, showerOverdue = false;
let bedtimeOverdue = false;

// Checklist keys
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

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6:1);
  return new Date(d.setDate(diff));
}
function formatDate(date) {
  return date.toISOString().slice(0,10);
}

function updateDailySummary() {
  document.getElementById("todayAwarded").innerText = `Awarded: ${todayAwarded}`;
  document.getElementById("todayLost").innerText = `Lost: ${todayLost}`;
  document.getElementById("todayNet").innerText = `Net: ${todayNet}`;
}

function updateBar(weekly) {
  const fill = document.getElementById("weeklyBarFill");
  const label = document.getElementById("weeklyBarLabel");
  const max = 75;
  let pct = Math.min(weekly / max, 1) * 100;
  fill.style.width = `${pct}%`;
  label.innerText = `${weekly}/${max}`;
}

function updateRecoverySummary() {
  document.getElementById("lostPointsSummary").innerText = `Lost points this week: ${lostPointsThisWeek}`;
  document.getElementById("recoveredPointsSummary").innerText = `Recovered: ${recoveredPointsThisWeek}`;
}

function updateSummary(data) {
  let weekly = data.weeklyTotal || 0;
  let monthly = data.monthlyTotal || 0;
  let chf = Math.floor((weekly >= 75 ? 5 : weekly / 15));
  document.getElementById("weeklyTotal").innerText = `Weekly: ${weekly}`;
  document.getElementById("monthlyTotal").innerText = `Monthly: ${monthly}`;
  document.getElementById("moneyTotal").innerText = `CHF: ${chf}`;
  updateBar(weekly);
  // Visual warning at max points (week)
  document.getElementById("maxWarning").style.display = (weekly >= 75) ? "inline-block" : "none";
}

function updateOverdueAlerts() {
  let alertBox = document.getElementById("overdueAlerts");
  alertBox.innerHTML = "";
  if (showerOverdue) {
    let span = document.createElement("div");
    span.className = "alert";
    span.innerText = "⚠️ Shower overdue! Not logged for 2 days.";
    alertBox.appendChild(span);
  }
  if (bedtimeOverdue) {
    let span = document.createElement("div");
    span.className = "warning";
    span.innerText = "⚠️ Bedtime rule missed! Mark as broken if not respected.";
    alertBox.appendChild(span);
  }
}

async function loadUser(user) {
  currentUser = user;
  const userRef = doc(db, "users", user);
  let snapshot = await getDoc(userRef);
  let monday = formatDate(getMonday(new Date()));
  let data;
  if (snapshot.exists()) {
    data = snapshot.data();
  } else {
    data = {
      points: 0,
      history: [],
      weeklyTotal: 0,
      monthlyTotal: 0,
      lastWeekly: monday,
      lostPointsThisWeek: 0,
      recoveredPointsThisWeek: 0,
      lastDaily: { date: todayStr, completed: {}, awarded: false, rulesBroken: {} },
      lastShowerDate: todayStr,
    };
    await setDoc(userRef, data);
  }
  // Weekly reset
  if (data.lastWeekly !== monday) {
    data.weeklyTotal = 0;
    data.lostPointsThisWeek = 0;
    data.recoveredPointsThisWeek = 0;
    data.lastWeekly = monday;
    await updateDoc(userRef, {
      weeklyTotal: 0,
      lostPointsThisWeek: 0,
      recoveredPointsThisWeek: 0,
      lastWeekly: monday
    });
  }
  // Daily reset
  if (!data.lastDaily || data.lastDaily.date !== todayStr) {
    data.lastDaily = { date: todayStr, completed: {}, awarded: false, rulesBroken: {} };
    await updateDoc(userRef, { lastDaily: data.lastDaily });
  }
  // Shower overdue check
  lastShowerDate = data.lastShowerDate || todayStr;
  let daysSinceShower = (new Date(todayStr) - new Date(lastShowerDate)) / (1000*3600*24);
  showerOverdue = daysSinceShower >= 2;
  // Bedtime overdue: if after 21:00 and not checked
  let now = new Date();
  bedtimeOverdue = (now.getHours() >= 21 && !data.lastDaily.completed.bedtime && !data.lastDaily.rulesBroken.bedtime);

  // Load summary stats
  todayAwarded = data.lastDaily.awarded ? 15 : 0;
  todayLost = Object.keys(data.lastDaily.rulesBroken || {}).length;
  todayNet = todayAwarded - todayLost;
  awardedToday = !!data.lastDaily.awarded;
  rulesBroken = data.lastDaily.rulesBroken || {};
  lostPointsThisWeek = data.lostPointsThisWeek || 0;
  recoveredPointsThisWeek = data.recoveredPointsThisWeek || 0;
  updateDailySummary();
  updateSummary(data);
  updateRecoverySummary();
  updateOverdueAlerts();

  // User UI
  document.getElementById("userName").innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
  document.getElementById("currentPoints").innerText = `${data.points || 0} Points`;
  document.querySelectorAll(".buttons button").forEach(btn => btn.classList.remove("selected"));
  document.getElementById(user).classList.add("selected");

  // Checklist
  dailyKeys.forEach(key => {
    const cb = document.getElementById("daily-" + key);
    if (cb) {
      cb.checked = !!data.lastDaily.completed[key];
      cb.disabled = true; // Mum uses minus buttons, disables checkboxes
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
}

// Points logic + weekly/monthly/recovery
async function addPoints(user, points, reason, opts={recovery:false}) {
  const userRef = doc(db, "users", user);
  let snapshot = await getDoc(userRef);
  let data = snapshot.exists() ? snapshot.data() : { points: 0, history: [] };
  let weeklyTotal = (data.weeklyTotal || 0);
  let monthlyTotal = (data.monthlyTotal || 0);
  let lostPointsThisWeek = (data.lostPointsThisWeek || 0);
  let recoveredPointsThisWeek = (data.recoveredPointsThisWeek || 0);

  // Weekly max cap
  if (points > 0 && !opts.recovery) {
    // Only count up to cap
    if (weeklyTotal + points > 75) {
      points = 75 - weeklyTotal;
      if (points <= 0) points = 0;
    }
    weeklyTotal += points;
    monthlyTotal += points;
  }
  // Recovery points logic
  if (opts.recovery && points > 0) {
    recoveredPointsThisWeek += points;
    weeklyTotal += points; // Recovery points also add to weekly
    monthlyTotal += points;
  }
  // Track lost points
  if (opts.lost) {
    lostPointsThisWeek += 1;
    weeklyTotal -= 1;
    monthlyTotal -= 1;
    if (weeklyTotal < 0) weeklyTotal = 0;
    if (monthlyTotal < 0) monthlyTotal = 0;
  }
  let newPoints = (data.points || 0) + points;
  let newHistoryItem = { time: new Date().toLocaleString(), points, reason };
  await updateDoc(userRef, {
    points: newPoints,
    weeklyTotal,
    monthlyTotal,
    lostPointsThisWeek,
    recoveredPointsThisWeek,
    history: arrayUnion(newHistoryItem)
  });
  // Update UI
  document.getElementById("currentPoints").innerText = `${newPoints} Points`;
  let historyList = document.getElementById("history");
  if (historyList) {
    let li = document.createElement("li");
    li.innerText = `${newHistoryItem.time} - ${newHistoryItem.points} Points (${newHistoryItem.reason})`;
    historyList.insertBefore(li, historyList.firstChild);
  }
  updateSummary({ weeklyTotal, monthlyTotal });
  lostPointsThisWeek = lostPointsThisWeek;
  recoveredPointsThisWeek = recoveredPointsThisWeek;
  updateRecoverySummary();
}

// Award daily points
document.addEventListener("DOMContentLoaded", () => {
  // User selection
  document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
  document.getElementById("linda").addEventListener("click", () => loadUser("linda"));

  // Daily points button
  const awardBtn = document.getElementById("awardDailyBtn");
  if (awardBtn) {
    awardBtn.addEventListener("click", async () => {
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
      // Disable daily checkboxes
      dailyKeys.forEach(key => {
        let cb = document.getElementById("daily-" + key);
        if (cb) cb.disabled = true;
      });
      // Enable minus buttons
      document.querySelectorAll(".minus-btn").forEach(btn => btn.disabled = false);
    });
  }

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
      await addPoints(currentUser, -1, `Rule broken: ${dailyLabels[key]}`, {lost:true});
      // Mark as broken in Firestore
      let userRef = doc(db, "users", currentUser);
      let snapshot = await getDoc(userRef);
      let data = snapshot.exists() ? snapshot.data() : {};
      data.lastDaily.rulesBroken[key] = true;
      await updateDoc(userRef, { lastDaily: data.lastDaily, lostPointsThisWeek: (data.lostPointsThisWeek||0)+1 });
      btn.disabled = true;
    });
    btn.disabled = true; // Start disabled
  });

  // Rewarded behaviors (recovery)
  document.querySelectorAll(".bonus-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) return;
      const points = parseInt(btn.dataset.points);
      const reason = btn.innerText.replace(/\(\+\d+\)/,'').trim();
      const isRecovery = btn.dataset.type === "recovery";
      await addPoints(currentUser, points, reason, {recovery:isRecovery});
      if (isRecovery && points > 0) {
        let userRef = doc(db, "users", currentUser);
        let snapshot = await getDoc(userRef);
        let data = snapshot.exists() ? snapshot.data() : {};
        await updateDoc(userRef, { recoveredPointsThisWeek: (data.recoveredPointsThisWeek||0)+points });
        recoveredPointsThisWeek += points;
        updateRecoverySummary();
      }
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

  // Collapsible history
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
});
