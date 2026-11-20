
console.log("Registration JavaScript loaded!");

document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");
    const registerButton = document.getElementById("registerButton");

    if (!registerForm || !registerMessage || !registerButton) {
        console.error("Registration form elements not found!");
        return;
    }

    console.log("Registration form found!");

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();
        event.stopPropagation();

        console.log("CREATE ACCOUNT BUTTON CLICKED!");
        console.log("Registration form submitted!");

        // Diagnostic check
        setTimeout(function () {
            console.log("Checking page refresh...");
        }, 3000);

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;

        if (!name || !email || !password || !role) {
            registerMessage.style.color = "red";
            registerMessage.innerText = "Please fill in all fields.";
            return;
        }

        if (password.length < 8) {
            registerMessage.style.color = "red";
            registerMessage.innerText =
                "Password must contain at least 8 characters.";
            return;
        }

        try {
            registerButton.disabled = true;
            registerButton.innerText = "Creating Account...";

            registerMessage.style.color = "#7C5CFA";
            registerMessage.innerText = "Please wait...";

            console.log("Sending registration request...");

            const response = await fetch(
                "http://127.0.0.1:5000/api/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password,
                        role: role
                    })
                }
            );

            const data = await response.json();

            console.log("STEP 1: Backend response received");
            console.log("Backend response:", data);

            registerMessage.style.color = response.ok ? "green" : "red";

            registerMessage.innerText =
                data.message || "Registration completed.";

            console.log("STEP 2: Success message displayed");

        } catch (error) {

            console.error("Registration error:", error);

            registerMessage.style.color = "red";
            registerMessage.innerText =
                "Cannot connect to the backend.";

        } finally {

            registerButton.disabled = false;
            registerButton.innerText = "Create Account";

        }
    });
});
