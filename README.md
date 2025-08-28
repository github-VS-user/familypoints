# Family Points

🌟 **Family Points** is an easy-to-use web app for managing household routines, rewards, and point systems for kids.  
Built for parents who want a simple way to motivate good habits and track daily, weekly, and monthly progress.

---

## Features

- **Daily Checklist:** Track completion of daily routines/rules for each child.
- **Automatic Points System:** Award all daily points at once, subtract for rule breaks.
- **Weekly Progress Bar:** See points progress for the week (max 75/week, CHF conversion).
- **Rewarded Behaviors:** Add bonus points for extra chores and helpful actions.
- **School Tracking:** Log school grades and apply rewards/penalties.
- **History & Summaries:** View full history, weekly/monthly summaries, and CHF earned.
- **Visual Feedback:** Alerts for overdue showers, bedtime, max points reached.
- **Mobile Friendly:** Responsive design for all devices.
- **Easy Reset:** Reset all points/summaries for a user with one click.
- **Multi-user:** Supports multiple children (e.g. Dario, Linda).
- **Version Tag:** Shows app version (easy to change).

---

## How It Works

1. **Select a child** (`Dario` or `Linda`) to view and manage their points.
2. **Award Daily Points:**  
   Click the "Award Daily Points" button to give 15 points for the day.
3. **Rule Breaks:**  
   If any rule is broken, click the red `-1` button next to the rule to subtract a point.
4. **Add Bonus Points:**  
   Use the *Rewarded Behaviors* buttons for extra points (chores, good deeds, etc.).
5. **School Rewards/Penalties:**  
   Log grades and apply large bonuses/penalties as needed.
6. **Track Progress:**  
   Weekly progress bar, summaries, and CHF money earned update automatically.
7. **History:**  
   View all point transactions in the Points History section.
8. **Reset:**  
   Reset all data for a child with the "Reset All" button.
9. **Version:**  
   App version shown at bottom right (edit in `index.html`).

---

## Setup & Usage

1. **Hosting:**  
   - Hosted on GitHub Pages/custom domain.
   - Uses Firebase Firestore for data (see `index.html` for config).

2. **Files:**  
   - `index.html` — Main page structure and logic.
   - `style.css` — Responsive and modern styles.
   - `script.js` — Main app logic, Firebase integration.
   - `CNAME` — Custom domain support.
   - `SECURITY.md` — Security and contact info.

3. **How to Customize:**
   - **Add/Change users:** Edit the buttons in `index.html`.
   - **Change rules/rewards:** Edit checklists and buttons in `index.html`.
   - **Change app version:** Update the `<div class="version">v3.1</div>` at the end of `index.html`.
   - **Firebase:** Use your own Firestore project if needed.

4. **No installation required**  
   - Open in browser, all data is saved online.

---

## Screenshots

> ![Family Points App Screenshot](https://familypoints.master3d.net/screenshot.png)
*(Add your own screenshot!)*

---

## License

MIT License

---

## Security

See [SECURITY.md](SECURITY.md) for details or to report vulnerabilities.

---

## Contact

Email: dariodibonaoff@gmail.com

---

## Version

**v3.1**
