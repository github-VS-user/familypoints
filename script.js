// API Base URL
const baseUrl = 'https://familypoints.onrender.com';

// Initialize user data structure
const points = {
    dario: { points: 0, history: [] },
    linda: { points: 0, history: [] },
    walter: { points: 0, history: [] },
};

// Function to load user data from the server
async function loadUser(user) {
    const response = await fetch(`${baseUrl}/get_points/${user}`);

    if (response.ok) {
        const userData = await response.json();

        // Update the UI with the fetched data
        document.getElementById('userName').innerText = `${user.charAt(0).toUpperCase() + user.slice(1)}'s Points`;
        document.getElementById('currentPoints').innerText = `${userData.points} Points`;

        const historyList = document.getElementById('history');
        historyList.innerHTML = "";
        userData.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.innerText = `${item.time} - ${item.points} Points (${item.reason})`;
            historyList.appendChild(historyItem);
        });

        // Set up the "Update Points" button
        document.getElementById('updatePointsBtn').onclick = function () {
            updatePoints(user);
        };
    } else {
        alert("Error loading user data. Please try again later.");
    }
}

// Function to update points and add a reason to the history
async function updatePoints(user) {
    const pointChange = parseInt(document.getElementById('pointChange').value);
    const reason = document.getElementById('reason').value;

    if (!isNaN(pointChange) && reason.trim()) {
        const time = new Date().toLocaleString();

        // Prepare the data to be sent to the server
        const data = {
            points: pointChange,
            reason: reason,
            time: time
        };

        // Make a POST request to update the points on the server
        const response = await fetch(`${baseUrl}/update_points/${user}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            loadUser(user); // Reload the updated user data
        } else {
            alert("Error updating points. Please try again.");
        }
    } else {
        alert("Please enter a valid number of points and a reason.");
    }
}

// Function to handle button clicks and load the corresponding user data
function handleButtonClick(user) {
    loadUser(user);
}

// Add event listeners to buttons
document.getElementById('dario').addEventListener('click', () => handleButtonClick('dario'));
document.getElementById('linda').addEventListener('click', () => handleButtonClick('linda'));
document.getElementById('walter').addEventListener('click', () => handleButtonClick('walter'));
