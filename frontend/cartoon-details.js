
console.log("Cartoon Details JavaScript loaded!");

document.addEventListener("DOMContentLoaded", function () {

    // GET HTML ELEMENTS
    const cartoonName = document.getElementById("cartoonName");
    const cartoonDescription = document.getElementById("cartoonDescription");
    const cartoonGenre = document.getElementById("cartoonGenre");
    const cartoonCharacters = document.getElementById("cartoonCharacters");
    const cartoonRelease = document.getElementById("cartoonRelease");
    const cartoonPoster = document.getElementById("cartoonPoster");
    const recommendationsContainer =
        document.getElementById("recommendationsContainer");

    // CARTOON DATABASE
    const cartoons = {

        tom: {
            name: "Tom and Jerry",
            description: "Tom and Jerry is a popular animated comedy series featuring the funny adventures of Tom, a cat, and Jerry, a clever mouse.",
            genre: ["Comedy", "Adventure"],
            characters: "Tom, Jerry, Spike, Tyke",
            release: "1940",
            poster: "images/tom.jpg"
        },

        doraemon: {
            name: "Doraemon",
            description: "Doraemon is a robotic cat from the future who helps Nobita using amazing futuristic gadgets.",
            genre: ["Comedy", "Adventure", "Science Fiction"],
            characters: "Doraemon, Nobita, Shizuka, Gian, Suneo",
            release: "1973",
            poster: "images/doraemon.jpg"
        },

        shinchan: {
            name: "Shinchan",
            description: "Shinchan is a funny and energetic young boy who creates entertaining moments with his family and friends.",
            genre: ["Comedy", "Family"],
            characters: "Shinchan, Misae, Hiroshi, Himawari",
            release: "1992",
            poster: "images/shinchan.jpg"
        },

        kungfu: {
            name: "Kung Fu Panda",
            description: "Po is a panda who dreams of becoming a kung fu master and learns about courage, friendship and responsibility.",
            genre: ["Action", "Comedy", "Adventure"],
            characters: "Po, Tigress, Shifu, Monkey, Crane",
            release: "2008",
            poster: "images/kungfu-panda.jpg"
        },

        spongebob: {
            name: "SpongeBob SquarePants",
            description: "SpongeBob is a cheerful sea sponge who enjoys working at the Krusty Krab and spending time with his friends.",
            genre: ["Comedy", "Adventure"],
            characters: "SpongeBob, Patrick, Squidward, Sandy",
            release: "1999",
            poster: "images/spongebob.jpg"
        },

        dragonball: {
            name: "Dragon Ball",
            description: "Dragon Ball follows Goku and his friends through exciting adventures, challenges and battles.",
            genre: ["Action", "Adventure", "Fantasy"],
            characters: "Goku, Vegeta, Gohan, Bulma, Piccolo",
            release: "1986",
            poster: "images/dragonball.jpg"
        }

    };

    // GET SELECTED CARTOON FROM URL
    const urlParams = new URLSearchParams(window.location.search);
    const cartoonId = urlParams.get("id");

    const selectedCartoon = cartoons[cartoonId];

    // CHECK SELECTED CARTOON
    if (!selectedCartoon) {

        cartoonName.textContent = "Cartoon Not Found";
        cartoonDescription.textContent =
            "Sorry, the selected cartoon could not be found.";

        cartoonGenre.textContent = "Not available";
        cartoonCharacters.textContent = "Not available";
        cartoonRelease.textContent = "Not available";

        cartoonPoster.textContent = "❓";

        recommendationsContainer.textContent = "";

        return;
    }

    // DISPLAY CARTOON DETAILS
    cartoonName.textContent = selectedCartoon.name;
    cartoonDescription.textContent = selectedCartoon.description;
    cartoonGenre.textContent = selectedCartoon.genre.join(", ");
    cartoonCharacters.textContent = selectedCartoon.characters;
    cartoonRelease.textContent = selectedCartoon.release;

    // DISPLAY ACTUAL CARTOON POSTER IMAGE
    const posterImage = document.createElement("img");

    posterImage.src = selectedCartoon.poster;
    posterImage.alt = selectedCartoon.name + " poster";
    posterImage.className = "cartoon-poster-image";

    posterImage.onerror = function () {
        cartoonPoster.textContent = "Poster image not found";
    };

    cartoonPoster.innerHTML = "";
    cartoonPoster.appendChild(posterImage);

    // UPDATE RECOMMENDATION SECTION HEADING
    const recommendationSection =
        recommendationsContainer.closest(".recommendations-section");

    if (recommendationSection) {

        const heading = recommendationSection.querySelector("h2");
        const paragraph = recommendationSection.querySelector("p");

        if (heading) {
            heading.textContent = "🎬 " + selectedCartoon.name + " Videos";
        }

        if (paragraph) {
            paragraph.textContent =
                "Watch videos related to " + selectedCartoon.name + "!";
        }
    }

    // FETCH YOUTUBE VIDEO RECOMMENDATIONS
    async function getYouTubeRecommendations() {

        recommendationsContainer.innerHTML =
            "<p>Loading YouTube recommendations...</p>";

        try {

            const response = await fetch(
                `http://127.0.0.1:5000/api/videos/${encodeURIComponent(cartoonId)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to load YouTube videos."
                );
            }

            if (!Array.isArray(data.videos) || data.videos.length === 0) {

                recommendationsContainer.textContent =
                    "No YouTube videos found for this cartoon.";

                return;
            }

            // CLEAR LOADING MESSAGE
            recommendationsContainer.innerHTML = "";

            // DISPLAY EACH VIDEO
            data.videos.forEach(function (video) {

                // VALIDATE YOUTUBE VIDEO ID
                if (
                    typeof video.videoId !== "string" ||
                    !/^[A-Za-z0-9_-]{11}$/.test(video.videoId)
                ) {
                    return;
                }

                // CREATE VIDEO CARD
                const card = document.createElement("div");
                card.className = "video-card";

                // CREATE VIDEO PLAYER AREA
                const playerContainer = document.createElement("div");
                playerContainer.className = "video-player";

                // CREATE THUMBNAIL
                const thumbnail = document.createElement("img");

                thumbnail.className = "video-thumbnail";

                thumbnail.src =
                    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

                thumbnail.alt = video.title || "Cartoon video thumbnail";
                thumbnail.loading = "lazy";

                // CREATE PLAY BUTTON
                const playButton = document.createElement("button");

                playButton.type = "button";
                playButton.className = "play-video-button";
                playButton.textContent = "▶ Play Video";

                // PLAY VIDEO WHEN BUTTON IS CLICKED
                playButton.addEventListener("click", function () {

                    const iframe = document.createElement("iframe");

                    iframe.src =
                        `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`;

                    iframe.title = video.title || "Cartoon video";

                    iframe.allow =
                        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

                    iframe.allowFullscreen = true;
                    iframe.loading = "lazy";

                    iframe.referrerPolicy =
                        "strict-origin-when-cross-origin";

                    iframe.className = "video-iframe";

                    playerContainer.innerHTML = "";
                    playerContainer.appendChild(iframe);

                });

                // VIDEO INFORMATION
                const content = document.createElement("div");
                content.className = "video-card-content";

                const title = document.createElement("h3");

                title.textContent =
                    video.title || "Untitled Cartoon Video";

                const channel = document.createElement("p");

                channel.className = "video-channel";

                channel.textContent =
                    "Channel: " + (video.channel || "Unknown channel");

                // WATCH ON YOUTUBE LINK
                const youtubeLink = document.createElement("a");

                youtubeLink.href =
                    `https://www.youtube.com/watch?v=${video.videoId}`;

                youtubeLink.textContent = "Watch on YouTube";

                youtubeLink.target = "_blank";
                youtubeLink.rel = "noopener noreferrer";

                // ADD ELEMENTS TO CARD
                playerContainer.appendChild(thumbnail);
                playerContainer.appendChild(playButton);

                content.appendChild(title);
                content.appendChild(channel);
                content.appendChild(youtubeLink);

                card.appendChild(playerContainer);
                card.appendChild(content);

                recommendationsContainer.appendChild(card);

            });

            if (recommendationsContainer.children.length === 0) {

                recommendationsContainer.textContent =
                    "No valid YouTube videos were returned.";

            }

        } catch (error) {

            console.error("YouTube recommendation error:", error);

            recommendationsContainer.textContent =
                "Unable to load YouTube videos. Please check whether your Flask backend is running and try again.";

        }

    }

    // CALL YOUTUBE RECOMMENDATION FUNCTION
    getYouTubeRecommendations();

});
