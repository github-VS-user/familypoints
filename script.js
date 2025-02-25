async function loadPage(person) {
    const response = await fetch(`/points/${person}`);
    const data = await response.json();

    document.getElementById("content").innerHTML = `
        <h2>${person.toUpperCase()}: <span id="points">${data.points}</span> Points</h2>
        <input type="number" id="amount" placeholder="Add/Remove Points">
        <input type="text" id="reason" placeholder="Reason">
        <button onclick="updatePoints('${person}', 1)">Add</button>
        <button onclick="updatePoints('${person}', -1)">Remove</button>
        <h3>History</h3>
        <ul id="history">${data.history.map(entry => `<li>${entry}</li>`).join('')}</ul>
    `;
}

async function updatePoints(person, multiplier) {
    const amount = document.getElementById("amount").value;
    const reason = document.getElementById("reason").value;
    
    if (!amount || !reason) {
        alert("Please enter an amount and a reason.");
        return;
    }

    const response = await fetch(`/update/${person}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount * multiplier, reason })
    });

    const data = await response.json();
    document.getElementById("points").innerText = data.points;
    document.getElementById("history").innerHTML = data.history.map(entry => `<li>${entry}</li>`).join('');
}
