
console.log("Favorites JavaScript loaded!");

document.addEventListener("DOMContentLoaded", function () {

    const favoritesContainer = document.getElementById("favoritesContainer");
    const loadingMessage = document.getElementById("loadingMessage");
    const emptyMessage = document.getElementById("emptyMessage");

    const userId = sessionStorage.getItem("userId");

    // Cartoon information
    const cartoons = {
        tom: {
            name: "Tom and Jerry",
            image: "images/tom.jpg",
            description: "A funny adventure between a cat and a mouse."
        },

        doraemon: {
            name: "Doraemon",
            image: "images/doraemon.jpg",
            description: "Explore exciting adventures with a robotic cat."
        },

        shinchan: {
            name: "Shinchan",
            image: "images/shinchan.jpg",
            description: "Enjoy funny moments and everyday adventures."
        },

        kungfu: {
            name: "Kung Fu Panda",
            image: "images/kungfu-panda.jpg",
            description: "Discover an adventure about courage and friendship."
        },

        spongebob: {
            name: "SpongeBob SquarePants",
            image: "images/spongebob.jpg",
            description: "Enjoy underwater adventures with SpongeBob."
        },

        dragonball: {
            name: "Dragon Ball",
            image: "images/dragonball.jpg",
            description: "Explore exciting adventures and powerful heroes."
        }
    };

    // Check login
    if (!userId) {
        window.location.href = "index.html";
        return;
    }

    // Load favorites
    async function loadFavorites() {

        try {

            const response = await fetch(
                `http://127.0.0.1:5000/api/favorites/${userId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load favorites.");
            }

            loadingMessage.style.display = "none";

            favoritesContainer.innerHTML = "";

            if (!data.favorites || data.favorites.length === 0) {

                emptyMessage.style.display = "block";
                return;

            }

            emptyMessage.style.display = "none";

            data.favorites.forEach(function (cartoonId) {

                const cartoon = cartoons[cartoonId];

                if (!cartoon) return;

                const card = document.createElement("div");
                card.className = "favorite-card";

                const image = document.createElement("img");
                image.src = cartoon.image;
                image.alt = cartoon.name;
                image.className = "favorite-image";

                const content = document.createElement("div");
                content.className = "favorite-content";

                const title = document.createElement("h3");
                title.textContent = cartoon.name;

                const description = document.createElement("p");
                description.textContent = cartoon.description;

                const watchButton = document.createElement("button");
                watchButton.textContent = "Watch Now ▶";
                watchButton.className = "watch-button";

                watchButton.addEventListener("click", function () {
                    window.location.href =
                        "cartoon-details.html?id=" + cartoonId;
                });

                const removeButton = document.createElement("button");
                removeButton.textContent = "❤️ Remove from Favorites";
                removeButton.className = "remove-button";

                removeButton.addEventListener("click", function () {
                    removeFavorite(cartoonId, card);
                });

                content.appendChild(title);
                content.appendChild(description);
                content.appendChild(watchButton);
                content.appendChild(removeButton);

                card.appendChild(image);
                card.appendChild(content);

                favoritesContainer.appendChild(card);

            });

        } catch (error) {

            console.error("Favorites error:", error);

            loadingMessage.style.display = "block";
            loadingMessage.textContent =
                "Unable to load favorites. Please try again.";

        }

    }

    // Remove favorite
    async function removeFavorite(cartoonId, card) {

        if (!confirm("Remove this cartoon from your favorites?")) {
            return;
        }

        try {

            const response = await fetch(
                "http://127.0.0.1:5000/api/favorites",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userId: Number(userId),
                        cartoonId: cartoonId
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Could not remove favorite.");
                return;
            }

            card.remove();

            if (favoritesContainer.children.length === 0) {
                emptyMessage.style.display = "block";
            }

        } catch (error) {

            console.error("Remove favorite error:", error);
            alert("Cannot connect to the backend.");

        }

    }

    loadFavorites();

});
