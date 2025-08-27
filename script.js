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
      data = { points: 0, history: [], weeklyTotal: 0, monthlyTotal: 0 };
      await setDoc(userRef, data);
    }

    if(userNameElem) userNameElem.innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
    if(currentPointsElem) currentPointsElem.innerText = `${data.points || 0} Points`;

    if (historyList) {
      historyList.innerHTML = "";
      (data.history || []).slice().reverse().forEach(item => {
        const li = document.createElement("li");
        li.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
        historyList.appendChild(li);
      });
    }

    if(userSection) userSection.style.display = "block";
    if(defaultMessage) defaultMessage.style.display = "none";

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

    // Update UI directly
    const currentPointsElem = document.getElementById("currentPoints");
    if (currentPointsElem) currentPointsElem.innerText = `${newPoints} Points`;

    const historyList = document.getElementById("history");
    if (historyList) {
      const li = document.createElement("li");
      li.innerText = `${newHistoryItem.time} - ${newHistoryItem.points} Points (${newHistoryItem.reason})`;
      historyList.insertBefore(li, historyList.firstChild); // newest first
    }

    // Optionally update summary (weekly/monthly totals)
    const weeklyTotal = (data.weeklyTotal || 0) + points;
    const monthlyTotal = (data.monthlyTotal || 0) + points;
    updateSummary({ weeklyTotal, monthlyTotal });
  } catch (error) {
    console.error("Error updating points:", error);
    alert("Failed to update points. Check your internet connection.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Event listeners for daily checklist
  document.querySelectorAll(".check-item").forEach(cb => {
    cb.addEventListener("change", async (e) => {
      if (!currentUser) return;
      const points = e.target.checked ? parseInt(e.target.dataset.points) : -parseInt(e.target.dataset.points);
      const reason = e.target.nextSibling.textContent.trim();
      await addPoints(currentUser, points, reason);
    });
  });

  // Event listeners for bonus buttons
  document.querySelectorAll(".bonus-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if (!currentUser) return;
      const points = parseInt(btn.dataset.points);
      const reason = btn.innerText.replace(/\(\+\d+\)/,'').trim();
      await addPoints(currentUser, points, reason);
    });
  });

  // Event listeners for school checkboxes
  document.querySelectorAll(".school-item").forEach(cb => {
    cb.addEventListener("change", async (e) => {
      if (!currentUser) return;
      const points = e.target.checked ? parseInt(e.target.dataset.points) : -parseInt(e.target.dataset.points);
      const reason = e.target.nextSibling.textContent.trim();
      await addPoints(currentUser, points, reason);
    });
  });

  // User selection buttons
  const darioBtn = document.getElementById("dario");
  const lindaBtn = document.getElementById("linda");
  if (darioBtn) darioBtn.addEventListener("click", () => loadUser("dario"));
  if (lindaBtn) lindaBtn.addEventListener("click", () => loadUser("linda"));
});
