
console.log("Login JavaScript loaded!");

document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (!loginForm || !loginMessage) {
        console.error("Login form elements not found!");
        return;
    }

    console.log("Login form found!");

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();
        event.stopPropagation();

        console.log("Login form submitted!");

        const email = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            loginMessage.style.color = "red";
            loginMessage.innerText =
                "Please enter your email and password.";
            return;
        }

        loginMessage.style.color = "#7C5CFA";
        loginMessage.innerText = "Checking login details...";

        try {

            console.log("Sending login request...");

            const response = await fetch(
                "http://127.0.0.1:5000/api/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        role: "child"
                    })
                }
            );

            const data = await response.json();

            console.log("Backend response:", data);

            if (response.ok) {

                loginMessage.style.color = "green";
                loginMessage.innerText =
                    "Welcome, " + data.name + "!";

                console.log("Login successful:", data);

                // Save user information
                sessionStorage.setItem("userName", data.name);
                sessionStorage.setItem("userId", data.userId);

                console.log("User ID saved:", data.userId);

                // Open Child Dashboard
                setTimeout(function () {
                    window.location.href = "child-dashboard.html";
                }, 1000);

            } else {

                loginMessage.style.color = "red";
                loginMessage.innerText =
                    data.message || "Login failed.";

            }

        } catch (error) {

            console.error("Login error:", error);

            loginMessage.style.color = "red";
            loginMessage.innerText =
                "Cannot connect to the backend.";

        }

    });

});
