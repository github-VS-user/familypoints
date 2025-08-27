import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

if (!window.app) {
  console.error("Firebase app not initialized. Make sure window.app exists.");
}

const db = getFirestore(window.app);
window.db = db;

let currentUser = null;
let todayStr = new Date().toISOString().slice(0,10); // "YYYY-MM-DD"

// Utility: Get checklist item keys (should match data-id in HTML)
const dailyKeys = [
  "dressed", "bed", "plate", "teeth", "shower", "ipad", "pajamas", "laundry",
  "clothes", "bedtime", "table_manners", "parent", "interrupt", "repeat"
];

// Utility: Map checklist item keys to human-readable labels
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

// Load user data
async function loadUser(user) {
  currentUser = user;
  try {
    const userRef = doc(db, "users", user);
    const snapshot = await getDoc(userRef);

    const userNameElem = document.getElementById("userName");
    const currentPointsElem = document.getElementById("currentPoints");
    const historyList = document.getElementById("history");
    const userSection = document.getElementById("userSection");
    const defaultMessage = document.getElementById("defaultMessage");

    if (!userNameElem || !currentPointsElem || !historyList || !userSection || !defaultMessage) {
      console.error("Missing one or more required HTML elements.");
      return;
    }

    let data;
    if (snapshot.exists()) {
      data = snapshot.data();
    } else {
      data = {
        points: 0,
        history: [],
        weeklyTotal: 0,
        monthlyTotal: 0,
        lastDaily: { date: todayStr, completed: {} }
      };
      await setDoc(userRef, data);
    }

    // Daily reset logic
    if (!data.lastDaily || data.lastDaily.date !== todayStr) {
      // New day: clear completed
      data.lastDaily = { date: todayStr, completed: {} };
      await updateDoc(userRef, { lastDaily: data.lastDaily });
    }

    userNameElem.innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
    currentPointsElem.innerText = `${data.points || 0} Points`;

    // Render checklist
    dailyKeys.forEach(key => {
      const cb = document.getElementById("daily-" + key);
      if (cb) {
        cb.checked = !!data.lastDaily.completed[key];
        cb.disabled = !!data.lastDaily.completed[key]; // Disable if already done today
      }
    });

    // Render history
    historyList.innerHTML = "";
    (data.history || []).slice().reverse().forEach(item => {
      const li = document.createElement("li");
      li.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
      historyList.appendChild(li);
    });

    userSection.style.display = "block";
    defaultMessage.style.display = "none";
    updateSummary(data);
  } catch (error) {
    console.error("Error loading user:", error);
    alert("Failed to load user data. Check your internet connection.");
  }
}

// Update summary placeholders safely
function updateSummary(data) {
  const weeklyEl = document.getElementById("weeklyTotal");
  const monthlyEl = document.getElementById("monthlyTotal");
  const moneyEl = document.getElementById("moneyTotal");

  if (weeklyEl) weeklyEl.innerText = `Weekly Points: ${data.weeklyTotal || 0}`;
  if (monthlyEl) monthlyEl.innerText = `Monthly Points: ${data.monthlyTotal || 0}`;
  if (moneyEl) moneyEl.innerText = `Money Equivalent: ${Math.floor((data.monthlyTotal || 0)/15)} CHF`;
}

// Central function to add points and update UI directly
async function addPoints(user, points, reason) {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user);
    const snapshot = await getDoc(userRef);
    const data = snapshot.exists() ? snapshot.data() : { points: 0, history: [] };

    const newPoints = (data.points || 0) + points;
    const newHistoryItem = { time: new Date().toLocaleString(), points, reason };

    // Update Firestore
    await updateDoc(userRef, {
      points: newPoints,
      history: arrayUnion(newHistoryItem)
    });

    document.getElementById("currentPoints").innerText = `${newPoints} Points`;
    const historyList = document.getElementById("history");
    if (historyList) {
      const li = document.createElement("li");
      li.innerText = `${newHistoryItem.time} - ${newHistoryItem.points} Points (${newHistoryItem.reason})`;
      historyList.insertBefore(li, historyList.firstChild);
    }

    // Optionally update summary
    const weeklyTotal = (data.weeklyTotal || 0) + points;
    const monthlyTotal = (data.monthlyTotal || 0) + points;
    updateSummary({ weeklyTotal, monthlyTotal });
  } catch (error) {
    console.error("Error updating points:", error);
    alert("Failed to update points. Check your internet connection.");
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Daily checklist event listeners (use data-id for each)
  dailyKeys.forEach(key => {
    const cb = document.getElementById("daily-" + key);
    if (cb) {
      cb.addEventListener("change", async (e) => {
        if (!currentUser) return;
        // Only allow action if not already completed today
        const userRef = doc(db, "users", currentUser);
        const snapshot = await getDoc(userRef);
        const data = snapshot.exists() ? snapshot.data() : { lastDaily: { date: todayStr, completed: {} } };
        if (data.lastDaily.date !== todayStr) {
          // Should not happen because loadUser resets, but just in case
          data.lastDaily = { date: todayStr, completed: {} };
          await updateDoc(userRef, { lastDaily: data.lastDaily });
        }
        if (data.lastDaily.completed[key]) {
          cb.checked = true;
          cb.disabled = true;
          return;
        }
        // Award points and mark as completed
        const points = parseInt(cb.dataset.points);
        await addPoints(currentUser, points, dailyLabels[key]);
        data.lastDaily.completed[key] = true;
        await updateDoc(userRef, { lastDaily: data.lastDaily });
        cb.disabled = true;
      });
    }
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

  // User selection buttons
  document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
  document.getElementById("linda").addEventListener("click", () => loadUser("linda"));

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
});
