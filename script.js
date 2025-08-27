import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore(window.app);
window.db = db;

let currentUser = null;

// Load user data
async function loadUser(user) {
  currentUser = user;
  try {
    const userRef = doc(db, "users", user);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      const data = snapshot.data();

      const userNameElem = document.getElementById("userName");
      if (userNameElem) {
        userNameElem.innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
      }

      const currentPointsElem = document.getElementById("currentPoints");
      if (currentPointsElem) {
        currentPointsElem.innerText = `${data.points || 0} Points`;
      }

      const historyList = document.getElementById("history");
      if (historyList) {
        historyList.innerHTML = "";
        (data.history || []).slice().reverse().forEach(item => {
          const li = document.createElement("li");
          li.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
          historyList.appendChild(li);
        });
      }

      const userSection = document.getElementById("userSection");
      if (userSection) {
        userSection.style.display = "block";
      }

      const defaultMessage = document.getElementById("defaultMessage");
      if (defaultMessage) {
        defaultMessage.style.display = "none";
      }

      updateSummary(data);
    } else {
      await setDoc(userRef, { points: 0, history: [] });
      loadUser(user);
    }
  } catch (error) {
    console.error("Error loading user:", error);
    alert("Failed to load user data.");
  }
}

// Update summary placeholders
function updateSummary(data) {
  const weekly = data.weeklyTotal || 0;
  const monthly = data.monthlyTotal || 0;
  const money = Math.floor((monthly / 15) * 1); // 1 CHF per 15 points
  document.getElementById("weeklyTotal").innerText = `Weekly Points: ${weekly}`;
  document.getElementById("monthlyTotal").innerText = `Monthly Points: ${monthly}`;
  document.getElementById("moneyTotal").innerText = `Money Equivalent: ${money} CHF`;
}

// Handle daily checklist
document.querySelectorAll(".check-item").forEach(cb => {
  cb.addEventListener("change", async (e) => {
    if (!currentUser) return;
    const points = e.target.checked ? parseInt(e.target.dataset.points) : -parseInt(e.target.dataset.points);
    const reason = e.target.nextSibling.textContent.trim();
    await addPoints(currentUser, points, reason);
  });
});

// Handle bonus buttons
document.querySelectorAll(".bonus-btn").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    if (!currentUser) return;
    const points = parseInt(btn.dataset.points);
    const reason = btn.innerText.replace(/\(\+\d+\)/,'').trim();
    await addPoints(currentUser, points, reason);
  });
});

// Handle school checkboxes
document.querySelectorAll(".school-item").forEach(cb => {
  cb.addEventListener("change", async (e) => {
    if (!currentUser) return;
    const points = e.target.checked ? parseInt(e.target.dataset.points) : -parseInt(e.target.dataset.points);
    const reason = e.target.nextSibling.textContent.trim();
    await addPoints(currentUser, points, reason);
  });
});

// Central function to add points
async function addPoints(user, points, reason) {
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

    // Reload user to refresh UI
    loadUser(user);
  } catch (error) {
    console.error("Error updating points:", error);
  }
}

// User selection buttons
document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
document.getElementById("linda").addEventListener("click", () => loadUser("linda"));
