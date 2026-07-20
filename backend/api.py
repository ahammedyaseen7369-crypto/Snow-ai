
"""
Snow AI Ultra-Lite API — WITH VISION
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from pathlib import Path

from brain import SnowBrain

app = Flask(__name__)
CORS(app)

brain = SnowBrain()
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.route("/")
def root():
    return jsonify({"status": "Snow AI Ultra-Lite + Vision", "offline": True})

@app.route("/health")
def health():
    return jsonify(brain.get_stats())

@app.route("/models/status")
def models_status():
    """Single source of truth for whether models are actually loadable.
    The frontend should call this instead of checking file paths itself —
    it was previously checking a different path than where files actually
    get placed, which meant it could show 'model loaded' incorrectly."""
    return jsonify({
        "chat_available": brain.has_chat,
        "chat_path": brain.CHAT_MODEL_PATH,
        "vision_available": brain.has_vision,
        "vision_model_path": brain.VISION_MODEL_PATH,
        "vision_mmproj_path": brain.VISION_MMPROJ_PATH,
    })

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400
    result = brain.process(message)
    return jsonify(result)

@app.route("/chat/vision", methods=["POST"])
def vision():
    msg = request.form.get("message", "What do you see?")

    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    img = request.files["image"]
    img_path = UPLOAD_DIR / f"v_{img.filename}"
    img.save(img_path)

    result = brain.process(msg, image_path=str(img_path))
    return jsonify(result)

@app.route("/chat/file", methods=["POST"])
def file_chat():
    msg = request.form.get("message", "Teach me this")

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    file_path = UPLOAD_DIR / f"f_{f.filename}"
    f.save(file_path)

    result = brain.process(msg, file_path=str(file_path))
    return jsonify(result)

@app.route("/chat/screen", methods=["POST"])
def chat_screen():
    result = brain.process("Look at my screen")
    return jsonify(result)

@app.route("/memory/search", methods=["POST"])
def memory_search():
    query = request.get_json().get("query", "")
    results = brain.memory.search(query, n=10)
    return jsonify({"results": results})

@app.route("/memory/forget", methods=["POST"])
def memory_forget():
    query = request.get_json().get("query", "")
    result = brain.process(f"forget {query}")
    return jsonify(result)

@app.route("/memory/all", methods=["DELETE"])
def memory_forget_all():
    return jsonify({"result": brain.forget_all()})

if __name__ == "__main__":
    print("Snow AI Ultra-Lite + Vision starting...")
    print(f"Stats: {brain.get_stats()}")
    app.run(host="0.0.0.0", port=8000)
