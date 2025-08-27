import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Initialize Firestore from the app exposed in index.html
const db = getFirestore(window.app);
window.db = db;

let currentUser = null;

// Load user data
async function loadUser(user) {
  currentUser = user;
  try {
    const userRef = doc(window.db, "users", user);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      const data = snapshot.data();

      // Update UI
      document.getElementById("userName").innerText =
        `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
      document.getElementById("currentPoints").innerText = `${data.points} Points`;

      const historyList = document.getElementById("history");
      historyList.innerHTML = "";

      // Show newest history first
      data.history.slice().reverse().forEach(item => {
        const historyItem = document.createElement("li");
        historyItem.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
        historyList.appendChild(historyItem);
      });

      // Show user section, hide default message
      document.getElementById("userSection").style.display = "block";
      document.getElementById("defaultMessage").style.display = "none";
    } else {
      // Create user document if missing
      await setDoc(userRef, { points: 0, history: [] });
      loadUser(user);
    }
  } catch (error) {
    console.error("Error loading user:", error);
    alert("Failed to load user data. Please try again.");
  }
}

// Update points and add to history
async function updatePoints() {
  if (!currentUser) return;
  try {
    const pointChange = parseInt(document.getElementById("pointChange").value);
    const reasonSelect = document.getElementById("reason");
    let reason = reasonSelect.value;

    if (reason === "Other") {
      const otherReason = document.getElementById("otherReason").value.trim();
      if (!otherReason) {
        alert("Please enter a reason for 'Other'.");
        return;
      }
      reason = otherReason;
    }

    if (!isNaN(pointChange) && reason) {
      const userRef = doc(window.db, "users", currentUser);
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const newPoints = data.points + pointChange;
      const newHistoryItem = {
        time: new Date().toLocaleString(),
        points: pointChange,
        reason: reason
      };

      await updateDoc(userRef, {
        points: newPoints,
        history: arrayUnion(newHistoryItem)
      });

      // Clear point input field only
      document.getElementById("pointChange").value = '';

      loadUser(currentUser);
    } else {
      alert("Please enter a valid number of points and select a reason.");
    }
  } catch (error) {
    console.error("Error updating points:", error);
    alert("Failed to update points. Please try again.");
  }
}

// Event listeners for user selection
document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
document.getElementById("linda").addEventListener("click", () => loadUser("linda"));

// Assign updatePoints button listener once
document.getElementById("updatePointsBtn").addEventListener("click", updatePoints);

// Show/hide otherReason input based on reason select value
document.getElementById("reason").addEventListener("change", (event) => {
  const otherReasonInput = document.getElementById("otherReason");
  if (event.target.value === "Other") {
    otherReasonInput.style.display = "inline-block";
  } else {
    otherReasonInput.style.display = "none";
    otherReasonInput.value = '';
  }
});
