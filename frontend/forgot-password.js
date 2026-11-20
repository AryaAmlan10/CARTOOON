
console.log("Forgot Password JavaScript loaded!");

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotMessage = document.getElementById("forgotMessage");

if (!forgotPasswordForm) {
    console.error("Forgot password form not found!");
} else {

    console.log("Forgot password form found!");

    forgotPasswordForm.addEventListener("submit", async function(event) {

        // Prevent page refresh
        event.preventDefault();

        console.log("Forgot password form submitted!");

        const emailInput = document.getElementById("email");
        const email = emailInput.value.trim();

        // Validate email
        if (!email) {
            forgotMessage.style.color = "red";
            forgotMessage.innerText = "Please enter your email.";
            return;
        }

        // Show loading message
        forgotMessage.style.color = "#7C5CFA";
        forgotMessage.innerText = "Checking your account...";

        try {

            console.log("Sending request to Flask backend...");

            const response = await fetch(
                "http://127.0.0.1:5000/api/forgot-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email
                    })
                }
            );

            console.log("Backend response status:", response.status);

            const data = await response.json();

            console.log("Backend response:", data);

            if (response.ok) {

                forgotMessage.style.color = "green";
                forgotMessage.innerText =
                    data.message || "Please check your email.";

            } else {

                forgotMessage.style.color = "red";
                forgotMessage.innerText =
                    data.message || "Could not send reset email.";

            }

        } catch (error) {

            console.error("Forgot password error:", error);

            forgotMessage.style.color = "red";
            forgotMessage.innerText =
                "Cannot connect to the backend. Please try again.";

        }

    });
}
