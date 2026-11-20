
console.log("Dashboard JavaScript loaded!");

document.addEventListener("DOMContentLoaded", function () {

    // Get HTML elements
    const welcomeTitle = document.getElementById("welcomeTitle");
    const logoutButton = document.getElementById("logoutButton");

    // Check login session
    const userName = sessionStorage.getItem("userName");

    // Protect dashboard and cartoons page
    if (!userName) {
        window.location.replace("index.html");
        return;
    }

    // Display user's name on dashboard
    if (welcomeTitle) {
        welcomeTitle.textContent =
            "Welcome, " + userName + "! 🌈";
    }

    // Logout functionality
    if (logoutButton) {

        logoutButton.addEventListener("click", function () {

            // Clear user session
            sessionStorage.removeItem("userName");

            // Redirect to login page
            window.location.replace("index.html");

        });

    }

});
