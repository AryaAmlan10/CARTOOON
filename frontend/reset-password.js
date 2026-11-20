
const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetMessage = document.getElementById("resetMessage");

resetPasswordForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Check password length
    if (newPassword.length < 8) {
        resetMessage.style.color = "red";
        resetMessage.innerText = "Password must contain at least 8 characters.";
        return;
    }

    // Check whether passwords match
    if (newPassword !== confirmPassword) {
        resetMessage.style.color = "red";
        resetMessage.innerText = "Passwords do not match.";
        return;
    }

    // Get reset token from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
        resetMessage.style.color = "red";
        resetMessage.innerText = "Invalid or missing reset link.";
        return;
    }

    resetMessage.style.color = "#7C5CFA";
    resetMessage.innerText = "Updating your password...";

    try {
        const response = await fetch(
            "http://127.0.0.1:5000/api/reset-password",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    password: newPassword
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            resetMessage.style.color = "green";
            resetMessage.innerText = data.message;

            resetPasswordForm.reset();
        } else {
            resetMessage.style.color = "red";
            resetMessage.innerText = data.message;
        }

    } catch (error) {
        resetMessage.style.color = "red";
        resetMessage.innerText = "Cannot connect to the backend.";
        console.error(error);
    }
});
