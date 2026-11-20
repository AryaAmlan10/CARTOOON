
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

import sqlite3
import os
import secrets
import hashlib
import requests
import re

from datetime import datetime, timedelta, timezone


# ==========================================
# 1. INITIALIZE FLASK
# ==========================================

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    os.path.join(BASE_DIR, ".env"),
    override=True
)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()


# ==========================================
# 2. GMAIL CONFIGURATION
# ==========================================

app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 465
app.config["MAIL_USE_TLS"] = False
app.config["MAIL_USE_SSL"] = True

app.config["MAIL_USERNAME"] = os.getenv(
    "MAIL_USERNAME", ""
).strip()

app.config["MAIL_PASSWORD"] = os.getenv(
    "MAIL_PASSWORD", ""
).replace(" ", "").strip()

app.config["MAIL_DEFAULT_SENDER"] = app.config["MAIL_USERNAME"]

mail = Mail(app)


# ==========================================
# 3. DATABASE CONFIGURATION
# ==========================================

DATABASE = os.path.join(
    BASE_DIR,
    "..",
    "database",
    "cartoonworld.db"
)


# ==========================================
# 4. SUPPORTED CARTOONS
# ==========================================

SUPPORTED_CARTOONS = {
    "tom",
    "doraemon",
    "shinchan",
    "kungfu",
    "spongebob",
    "dragonball"
}


# ==========================================
# 5. CREATE DATABASE AND TABLES
# ==========================================

def create_database():

    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)

    connection = sqlite3.connect(DATABASE)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # NEW: FAVORITES TABLE
    connection.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            cartoon_id TEXT NOT NULL,
            UNIQUE(user_id, cartoon_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    connection.commit()
    connection.close()


# ==========================================
# 6. HELPER FUNCTIONS
# ==========================================

def get_request_data():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None

    return data


def valid_cartoon_id(cartoon_id):

    return (
        isinstance(cartoon_id, str)
        and cartoon_id in SUPPORTED_CARTOONS
    )


# ==========================================
# 7. HOME API
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "project": "CartoonWorld",
        "message": "Welcome to CartoonWorld!",
        "status": "Running"
    })


# ==========================================
# 8. YOUTUBE VIDEO RECOMMENDATION API
# ==========================================

CARTOON_SEARCHES = {

    "tom": {
        "query": '"Tom and Jerry" official cartoon',
        "keywords": ["tom and jerry", "tom & jerry"]
    },

    "doraemon": {
        "query": "Doraemon official cartoon episodes",
        "keywords": ["doraemon"]
    },

    "shinchan": {
        "query": "Shinchan official cartoon episodes",
        "keywords": ["shinchan", "shin chan"]
    },

    "kungfu": {
        "query": '"Kung Fu Panda" official animation',
        "keywords": ["kung fu panda", "kung-fu panda"]
    },

    "spongebob": {
        "query": '"SpongeBob SquarePants" official cartoon',
        "keywords": [
            "spongebob",
            "sponge bob",
            "spongebob squarepants"
        ]
    },

    "dragonball": {
        "query": '"Dragon Ball" official anime',
        "keywords": ["dragon ball", "dragonball"]
    }

}


def is_relevant_video(title, keywords):

    normalized_title = re.sub(
        r"[^a-z0-9]+",
        " ",
        title.lower()
    ).strip()

    for keyword in keywords:

        normalized_keyword = re.sub(
            r"[^a-z0-9]+",
            " ",
            keyword.lower()
        ).strip()

        if normalized_keyword in normalized_title:
            return True

    return False


@app.route("/api/videos/<cartoon_id>", methods=["GET"])
def get_cartoon_videos(cartoon_id):

    if cartoon_id not in CARTOON_SEARCHES:

        return jsonify({
            "message": "Cartoon not found"
        }), 404

    cartoon_config = CARTOON_SEARCHES[cartoon_id]

    if not YOUTUBE_API_KEY:

        return jsonify({
            "message": "YouTube API key is not configured"
        }), 503

    try:

        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",

            params={
                "part": "snippet",
                "q": cartoon_config["query"],
                "type": "video",
                "maxResults": 25,
                "safeSearch": "strict",
                "videoEmbeddable": "true",
                "regionCode": "IN",
                "relevanceLanguage": "en",
                "order": "relevance",
                "key": YOUTUBE_API_KEY
            },

            timeout=15
        )

        response.raise_for_status()

        data = response.json()

        videos = []
        seen_video_ids = set()

        for item in data.get("items", []):

            video_id = item.get("id", {}).get("videoId")

            if not video_id:
                continue

            if not (
                len(video_id) == 11
                and all(
                    char.isalnum() or char in "_-"
                    for char in video_id
                )
            ):
                continue

            if video_id in seen_video_ids:
                continue

            snippet = item.get("snippet", {})
            title = snippet.get("title", "")

            if not is_relevant_video(
                title,
                cartoon_config["keywords"]
            ):
                continue

            seen_video_ids.add(video_id)

            thumbnails = snippet.get("thumbnails", {})

            thumbnail = (
                thumbnails.get("high")
                or thumbnails.get("medium")
                or thumbnails.get("default")
                or {}
            )

            videos.append({

                "videoId": video_id,

                "title": title,

                "channel": snippet.get("channelTitle", ""),

                "thumbnail": thumbnail.get("url", ""),

                "watchUrl": (
                    "https://www.youtube.com/watch?v=" + video_id
                ),

                "embedUrl": (
                    "https://www.youtube-nocookie.com/embed/" + video_id
                )

            })

            if len(videos) >= 6:
                break

        return jsonify({

            "cartoon": cartoon_id,

            "total": len(videos),

            "videos": videos

        }), 200

    except requests.RequestException:

        app.logger.exception("YouTube API request failed")

        return jsonify({
            "message": "Unable to fetch YouTube videos. Check your API configuration."
        }), 502

    except (ValueError, KeyError, TypeError):

        app.logger.exception("Invalid YouTube API response")

        return jsonify({
            "message": "Invalid response received from YouTube"
        }), 502


# ==========================================
# 9. REGISTRATION API
# ==========================================

@app.route("/api/register", methods=["POST"])
def register():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all(isinstance(value, str) for value in [
        name, email, password, role
    ]):

        return jsonify({
            "message": "Invalid field values"
        }), 400

    name = name.strip()
    email = email.strip().lower()
    role = role.strip()

    if not name or not email or not password or not role:

        return jsonify({
            "message": "All fields are required"
        }), 400

    if len(password) < 8:

        return jsonify({
            "message": "Password must be at least 8 characters"
        }), 400

    if role not in ["child", "parent"]:

        return jsonify({
            "message": "Invalid account type"
        }), 400

    hashed_password = generate_password_hash(password)

    try:

        with sqlite3.connect(DATABASE) as connection:

            connection.execute("""
                INSERT INTO users (name, email, password, role)
                VALUES (?, ?, ?, ?)
            """, (name, email, hashed_password, role))

        return jsonify({
            "message": "Account created successfully!"
        }), 201

    except sqlite3.IntegrityError:

        return jsonify({
            "message": "Email already registered"
        }), 409

    except sqlite3.Error:

        app.logger.exception("Registration database error")

        return jsonify({
            "message": "Database error"
        }), 500


# ==========================================
# 10. LOGIN API
# ==========================================

@app.route("/api/login", methods=["POST"])
def login():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all(isinstance(value, str) for value in [
        email, password, role
    ]):

        return jsonify({
            "message": "Invalid field values"
        }), 400

    email = email.strip().lower()
    role = role.strip()

    if not email or not password or not role:

        return jsonify({
            "message": "All fields are required"
        }), 400

    if role not in ["child", "parent"]:

        return jsonify({
            "message": "Invalid account type"
        }), 400

    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row

    try:

        user = connection.execute("""
            SELECT * FROM users
            WHERE email = ? AND role = ?
        """, (email, role)).fetchone()

    except sqlite3.Error:

        app.logger.exception("Login database error")

        return jsonify({
            "message": "Database error"
        }), 500

    finally:

        connection.close()

    if user is None:

        return jsonify({
            "message": "Account not found"
        }), 401

    if not check_password_hash(user["password"], password):

        return jsonify({
            "message": "Incorrect password"
        }), 401

    return jsonify({

        "message": "Login successful!",

        "userId": user["id"],

        "name": user["name"],

        "role": user["role"]

    }), 200


# ==========================================
# 11. ADD FAVORITE API
# ==========================================

@app.route("/api/favorites", methods=["POST"])
def add_favorite():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    user_id = data.get("userId")
    cartoon_id = data.get("cartoonId")

    if (
        not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
        or not valid_cartoon_id(cartoon_id)
    ):

        return jsonify({
            "message": "Invalid user ID or cartoon ID"
        }), 400

    try:

        with sqlite3.connect(DATABASE) as connection:

            user = connection.execute("""
                SELECT id FROM users WHERE id = ?
            """, (user_id,)).fetchone()

            if user is None:

                return jsonify({
                    "message": "User not found"
                }), 404

            existing = connection.execute("""
                SELECT id FROM favorites
                WHERE user_id = ? AND cartoon_id = ?
            """, (user_id, cartoon_id)).fetchone()

            if existing:

                return jsonify({
                    "message": "Cartoon is already in your favorites"
                }), 200

            connection.execute("""
                INSERT INTO favorites (user_id, cartoon_id)
                VALUES (?, ?)
            """, (user_id, cartoon_id))

        return jsonify({
            "message": "Cartoon added to favorites!",
            "cartoonId": cartoon_id
        }), 201

    except sqlite3.Error:

        app.logger.exception("Add favorite database error")

        return jsonify({
            "message": "Unable to add favorite"
        }), 500


# ==========================================
# 12. GET USER FAVORITES API
# ==========================================

@app.route("/api/favorites/<int:user_id>", methods=["GET"])
def get_favorites(user_id):

    if user_id <= 0:

        return jsonify({
            "message": "Invalid user ID"
        }), 400

    try:

        with sqlite3.connect(DATABASE) as connection:

            connection.row_factory = sqlite3.Row

            user = connection.execute("""
                SELECT id FROM users WHERE id = ?
            """, (user_id,)).fetchone()

            if user is None:

                return jsonify({
                    "message": "User not found"
                }), 404

            favorites = connection.execute("""
                SELECT cartoon_id
                FROM favorites
                WHERE user_id = ?
                ORDER BY id DESC
            """, (user_id,)).fetchall()

            favorite_list = [
                row["cartoon_id"] for row in favorites
            ]

        return jsonify({

            "userId": user_id,

            "total": len(favorite_list),

            "favorites": favorite_list

        }), 200

    except sqlite3.Error:

        app.logger.exception("Get favorites database error")

        return jsonify({
            "message": "Unable to fetch favorites"
        }), 500


# ==========================================
# 13. REMOVE FAVORITE API
# ==========================================

@app.route("/api/favorites", methods=["DELETE"])
def remove_favorite():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    user_id = data.get("userId")
    cartoon_id = data.get("cartoonId")

    if (
        not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
        or not valid_cartoon_id(cartoon_id)
    ):

        return jsonify({
            "message": "Invalid user ID or cartoon ID"
        }), 400

    try:

        with sqlite3.connect(DATABASE) as connection:

            cursor = connection.execute("""
                DELETE FROM favorites
                WHERE user_id = ? AND cartoon_id = ?
            """, (user_id, cartoon_id))

            if cursor.rowcount == 0:

                return jsonify({
                    "message": "Favorite not found"
                }), 404

        return jsonify({
            "message": "Cartoon removed from favorites!",
            "cartoonId": cartoon_id
        }), 200

    except sqlite3.Error:

        app.logger.exception("Remove favorite database error")

        return jsonify({
            "message": "Unable to remove favorite"
        }), 500


# ==========================================
# 14. FORGOT PASSWORD API
# ==========================================

@app.route("/api/forgot-password", methods=["POST"])
def forgot_password():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    email = data.get("email")

    if not isinstance(email, str):

        return jsonify({
            "message": "Invalid email"
        }), 400

    email = email.strip().lower()

    if not email:

        return jsonify({
            "message": "Email is required"
        }), 400

    if not app.config["MAIL_USERNAME"] or not app.config["MAIL_PASSWORD"]:

        app.logger.error(
            "Gmail credentials are missing from backend/.env"
        )

        return jsonify({
            "message": "Email service is not configured"
        }), 503

    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row

    try:

        user = connection.execute("""
            SELECT id FROM users WHERE email = ?
        """, (email,)).fetchone()

        if user is None:

            return jsonify({
                "message": "If the account exists, a reset email will be sent."
            }), 200

        connection.execute("""
            DELETE FROM password_resets WHERE user_id = ?
        """, (user["id"],))

        token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(
            token.encode()
        ).hexdigest()

        expires_at = (
            datetime.now(timezone.utc) +
            timedelta(minutes=15)
        ).isoformat()

        connection.execute("""
            INSERT INTO password_resets
            (user_id, token_hash, expires_at)
            VALUES (?, ?, ?)
        """, (user["id"], token_hash, expires_at))

        connection.commit()

    except sqlite3.Error:

        connection.rollback()

        app.logger.exception("Password reset database error")

        return jsonify({
            "message": "Database error"
        }), 500

    finally:

        connection.close()

    reset_link = (
        "http://127.0.0.1:5500/frontend/reset-password.html"
        f"?token={token}"
    )

    try:

        message = Message(
            subject="CartoonWorld - Password Reset",
            recipients=[email]
        )

        message.body = f"""
Hello,

We received a request to reset your CartoonWorld password.

Click the link below to create a new password:

{reset_link}

This link expires in 15 minutes and can only be used once.

If you did not request this, ignore this email.

CartoonWorld Team
"""

        mail.send(message)

        app.logger.info(
            "Password reset email sent successfully."
        )

    except Exception:

        app.logger.exception(
            "Could not send password reset email"
        )

        with sqlite3.connect(DATABASE) as connection:

            connection.execute("""
                DELETE FROM password_resets
                WHERE token_hash = ?
            """, (token_hash,))

        return jsonify({
            "message": "Could not send reset email. Please try again."
        }), 503

    return jsonify({
        "message": "If the account exists, a reset email will be sent."
    }), 200


# ==========================================
# 15. RESET PASSWORD API
# ==========================================

@app.route("/api/reset-password", methods=["POST"])
def reset_password():

    data = get_request_data()

    if data is None:

        return jsonify({
            "message": "Invalid request data"
        }), 400

    token = data.get("token")
    new_password = data.get("password")

    if not isinstance(token, str) or not isinstance(new_password, str):

        return jsonify({
            "message": "Invalid field values"
        }), 400

    if not token or not new_password:

        return jsonify({
            "message": "Token and new password are required"
        }), 400

    if len(new_password) < 8:

        return jsonify({
            "message": "Password must be at least 8 characters"
        }), 400

    token_hash = hashlib.sha256(
        token.encode()
    ).hexdigest()

    connection = sqlite3.connect(DATABASE)

    try:

        reset = connection.execute("""
            SELECT user_id, expires_at
            FROM password_resets
            WHERE token_hash = ?
        """, (token_hash,)).fetchone()

        if reset is None:

            return jsonify({
                "message": "Invalid or expired reset link"
            }), 400

        expiry = datetime.fromisoformat(reset[1])

        if datetime.now(timezone.utc) >= expiry:

            connection.execute("""
                DELETE FROM password_resets
                WHERE token_hash = ?
            """, (token_hash,))

            connection.commit()

            return jsonify({
                "message": "Reset link has expired. Request another one."
            }), 400

        hashed_password = generate_password_hash(new_password)

        connection.execute("""
            UPDATE users
            SET password = ?
            WHERE id = ?
        """, (hashed_password, reset[0]))

        connection.execute("""
            DELETE FROM password_resets
            WHERE user_id = ?
        """, (reset[0],))

        connection.commit()

        return jsonify({
            "message": "Password reset successfully!"
        }), 200

    except sqlite3.Error:

        connection.rollback()

        app.logger.exception("Password reset error")

        return jsonify({
            "message": "Database error"
        }), 500

    finally:

        connection.close()


# ==========================================
# 16. START SERVER
# ==========================================

if __name__ == "__main__":

    create_database()

    print("\n================================")
    print("       CARTOONWORLD BACKEND")
    print("================================")

    print(
        "Gmail username configured:",
        bool(app.config["MAIL_USERNAME"])
    )

    print(
        "Gmail password configured:",
        bool(app.config["MAIL_PASSWORD"])
    )

    print(
        "YouTube API key configured:",
        bool(YOUTUBE_API_KEY)
    )

    print("SMTP Server: smtp.gmail.com")
    print("SMTP Port: 465 (SSL)")

    app.run(debug=True)
