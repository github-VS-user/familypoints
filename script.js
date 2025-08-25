import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Load user data
async function loadUser(user) {
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
    data.history.forEach(item => {
      const historyItem = document.createElement("li");
      historyItem.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
      historyList.appendChild(historyItem);
    });

    document.getElementById("updatePointsBtn").onclick = () => updatePoints(user);

    // Show user section, hide default message
    document.getElementById("userSection").style.display = "block";
    document.getElementById("defaultMessage").style.display = "none";
  } else {
    // Create user document if missing
    await setDoc(userRef, { points: 0, history: [] });
    loadUser(user);
  }
}

// Update points and add to history
async function updatePoints(user) {
  const pointChange = parseInt(document.getElementById("pointChange").value);
  const reason = document.getElementById("reason").value;

  if (!isNaN(pointChange) && reason.trim()) {
    const userRef = doc(window.db, "users", user);
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

    // Clear input fields
    document.getElementById("pointChange").value = '';
    document.getElementById("reason").value = '';

    loadUser(user);
  } else {
    alert("Please enter a valid number of points and a reason.");
  }
}

// Event listeners
document.getElementById("dario").addEventListener("click", () => loadUser("dario"));
document.getElementById("linda").addEventListener("click", () => loadUser("linda"));
