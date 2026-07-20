
"""
Snow AI Ultra-Lite Brain — WITH VISION
Runs entirely on Android. No cloud. No computer.
Storage: ~2.2GB (app + TinyLlama + Moondream)
"""

import json
import sqlite3
import os
import re
import hashlib
import pickle
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path


class NanoVectorStore:
    """Ultra-light vector store. No ChromaDB. ~0MB overhead."""

    def __init__(self, persist_dir: str):
        self.dir = Path(persist_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.vectors_file = self.dir / "v.pkl"
        self.docs_file = self.dir / "d.pkl"
        self.vectors = []
        self.docs = []
        self._load()

    def _load(self):
        try:
            if self.vectors_file.exists():
                with open(self.vectors_file, 'rb') as f:
                    self.vectors = pickle.load(f)
            if self.docs_file.exists():
                with open(self.docs_file, 'rb') as f:
                    self.docs = pickle.load(f)
        except:
            self.vectors = []
            self.docs = []

    def _save(self):
        with open(self.vectors_file, 'wb') as f:
            pickle.dump(self.vectors, f)
        with open(self.docs_file, 'wb') as f:
            pickle.dump(self.docs, f)

    def _embed(self, text: str) -> np.ndarray:
        vec = np.zeros(64, dtype=np.float32)
        words = text.lower().split()[:30]
        for word in words:
            h = hashlib.md5(word.encode()).hexdigest()
            for j in range(4):
                idx = int(h[j*4:j*4+4], 16) % 64
                vec[idx] += 1.0
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def add(self, content: str, meta: Dict = None):
        vec = self._embed(content)
        self.vectors.append(vec)
        self.docs.append({"c": content, "m": meta or {}, "id": len(self.vectors)-1})
        self._save()
        return len(self.vectors) - 1

    def search(self, query: str, n: int = 3) -> List[Dict]:
        if not self.vectors:
            return []
        qv = self._embed(query)
        sims = np.dot(np.array(self.vectors), qv)
        idxs = np.argsort(sims)[::-1][:n]
        return [{"content": self.docs[i]["c"], "score": float(sims[i])} 
                for i in idxs if sims[i] > 0.05]

    def delete(self, idx: int):
        if 0 <= idx < len(self.vectors):
            self.vectors.pop(idx)
            self.docs.pop(idx)
            for i, d in enumerate(self.docs):
                d["id"] = i
            self._save()

    def clear(self):
        self.vectors = []
        self.docs = []
        self._save()

    def count(self) -> int:
        return len(self.vectors)


class SnowBrain:
    """
    Snow AI Ultra-Lite Brain WITH VISION.

    Runs models in-process via llama-cpp-python. No daemon, no separate
    server, nothing else has to be running — this is what makes "no cloud,
    no computer" actually true. (An earlier version of this file called out
    to Ollama, which requires a background service Android can't run — that
    contradicted the product's own offline-only promise, so it's gone.)

    Models needed, both as local GGUF files on disk:
    - TinyLlama 1.1B Q4 (~600MB) for chat/teaching
    - A multimodal vision GGUF + mmproj file (~1.6GB combined) for vision

    Vision note: llama.cpp's multimodal (LLaVA-style) support needs TWO
    files per vision model — the main GGUF and a companion `mmproj-*.gguf`
    projector file. A single .gguf is not enough for vision; see
    VISION_MMPROJ_PATH below. If you don't have both files, vision simply
    stays unavailable and Snow says so honestly rather than pretending.
    """

    # Set these to wherever the app places downloaded models on-device.
    # Kept as class-level constants so api.py / tests can override cleanly.
    CHAT_MODEL_PATH = os.environ.get(
        "SNOW_CHAT_MODEL", "./models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
    )
    VISION_MODEL_PATH = os.environ.get("SNOW_VISION_MODEL", "./models/vision-model.gguf")
    VISION_MMPROJ_PATH = os.environ.get("SNOW_VISION_MMPROJ", "./models/vision-mmproj.gguf")

    N_CTX = int(os.environ.get("SNOW_N_CTX", 2048))
    N_THREADS = int(os.environ.get("SNOW_N_THREADS", os.cpu_count() or 4))
    MAX_NEW_TOKENS = int(os.environ.get("SNOW_MAX_TOKENS", 400))

    SYSTEM_PROMPT = "You are Snow AI — helpful, concise, intelligent."

    def __init__(self, data_dir: str = "./snow_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = self.data_dir / "snow.db"
        self.memory = NanoVectorStore(str(self.data_dir / "mem"))
        self.profile_path = self.data_dir / "p.json"

        self._init_db()
        self.profile = self._load_profile()

        # Models are loaded lazily, on first real use, so the app still
        # starts instantly even before any model file has been downloaded.
        self._chat_llm = None
        self._vision_llm = None
        self._chat_load_error = None
        self._vision_load_error = None

        self.has_chat = Path(self.CHAT_MODEL_PATH).exists()
        self.has_vision = (
            Path(self.VISION_MODEL_PATH).exists() and Path(self.VISION_MMPROJ_PATH).exists()
        )

        print(f"Snow AI ready | Chat: {'Yes' if self.has_chat else 'No'} | Vision: {'Yes' if self.has_vision else 'No'}")
        print(f"Memory: {self.memory.count()} items")

    def _get_chat_llm(self):
        """Lazy-load the chat model once. Raises RuntimeError with a clear
        message if the file is missing rather than failing silently."""
        if self._chat_llm is not None:
            return self._chat_llm
        if self._chat_load_error is not None:
            raise RuntimeError(self._chat_load_error)
        if not Path(self.CHAT_MODEL_PATH).exists():
            self._chat_load_error = (
                f"Chat model not found at {self.CHAT_MODEL_PATH}. "
                "Download a TinyLlama GGUF and place it there."
            )
            raise RuntimeError(self._chat_load_error)

        from llama_cpp import Llama
        self._chat_llm = Llama(
            model_path=self.CHAT_MODEL_PATH,
            n_ctx=self.N_CTX,
            n_threads=self.N_THREADS,
            verbose=False,
        )
        return self._chat_llm

    def _get_vision_llm(self):
        """Lazy-load the multimodal model + projector. Both files required."""
        if self._vision_llm is not None:
            return self._vision_llm
        if self._vision_load_error is not None:
            raise RuntimeError(self._vision_load_error)
        if not (Path(self.VISION_MODEL_PATH).exists() and Path(self.VISION_MMPROJ_PATH).exists()):
            self._vision_load_error = (
                f"Vision model files not found. Need BOTH {self.VISION_MODEL_PATH} "
                f"and {self.VISION_MMPROJ_PATH} (the projector file) present — "
                "a single .gguf is not enough for vision."
            )
            raise RuntimeError(self._vision_load_error)

        from llama_cpp import Llama
        from llama_cpp.llama_chat_format import Llava15ChatHandler

        chat_handler = Llava15ChatHandler(clip_model_path=self.VISION_MMPROJ_PATH)
        self._vision_llm = Llama(
            model_path=self.VISION_MODEL_PATH,
            chat_handler=chat_handler,
            n_ctx=self.N_CTX,
            n_threads=self.N_THREADS,
            verbose=False,
            logits_all=True,
        )
        return self._vision_llm

    def _init_db(self):
        conn = sqlite3.connect(str(self.db_path))
        c = conn.cursor()
        c.execute("CREATE TABLE IF NOT EXISTS msgs (id INTEGER PRIMARY KEY, role TEXT, content TEXT, intent TEXT, ts TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, name TEXT, content TEXT, ts TEXT)")
        conn.commit()
        conn.close()

    def _load_profile(self) -> Dict:
        try:
            with open(self.profile_path) as f:
                return json.load(f)
        except:
            return {"style": "adaptive", "level": {}, "count": 0, "topics": []}

    def _save_profile(self):
        with open(self.profile_path, 'w') as f:
            json.dump(self.profile, f)

    def _call_chat(self, prompt: str, system: str = "") -> str:
        """Run chat inference in-process via llama-cpp-python. No network,
        no other service — just the local model file."""
        try:
            llm = self._get_chat_llm()
        except RuntimeError as e:
            return f"AI not available. {e}"

        full_prompt = (
            f"<|system|>\n{system or self.SYSTEM_PROMPT}</s>\n"
            f"<|user|>\n{prompt}</s>\n"
            f"<|assistant|>\n"
        )
        try:
            result = llm(
                full_prompt,
                max_tokens=self.MAX_NEW_TOKENS,
                temperature=0.7,
                top_p=0.9,
                stop=["</s>", "<|user|>"],
            )
            return result["choices"][0]["text"].strip()
        except Exception as e:
            return f"Snow hit an error generating a response: {str(e)[:150]}"

    def _call_vision(self, image_path: str, prompt: str) -> str:
        """Run multimodal inference in-process via llama-cpp-python's LLaVA
        support. Requires both the vision GGUF and its mmproj file."""
        try:
            llm = self._get_vision_llm()
        except RuntimeError as e:
            return f"Vision not available. {e}"

        import base64
        try:
            with open(image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
            data_uri = f"data:image/jpeg;base64,{img_b64}"

            result = llm.create_chat_completion(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_uri}},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                max_tokens=self.MAX_NEW_TOKENS,
                temperature=0.4,
            )
            return result["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"Vision analysis failed: {str(e)[:150]}"

    def detect_intent(self, text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["teach", "explain", "how to", "learn", "what is"]):
            return "teach"
        if any(w in t for w in ["code", "program", "script", "bug", "debug"]):
            return "code"
        if any(w in t for w in ["look at this", "what is this", "analyze this", "diagnose", "what do you see"]):
            return "vision"
        if any(w in t for w in ["screen", "look at my screen"]):
            return "screen"
        if any(w in t for w in ["remember", "save this", "don't forget"]):
            return "remember"
        if any(w in t for w in ["forget", "delete memory", "remove"]):
            return "forget"
        if any(w in t for w in ["search", "find", "recall", "what did i say"]):
            return "search"
        return "chat"

    def process(self, message: str, image_path: str = None, file_path: str = None) -> Dict:
        intent = self.detect_intent(message)

        if image_path:
            intent = "vision"
        elif file_path:
            intent = "file"

        self._save_msg("user", message, intent)

        handlers = {
            "teach": self._handle_teach,
            "code": self._handle_code,
            "vision": self._handle_vision,
            "screen": self._handle_screen,
            "file": self._handle_file,
            "remember": self._handle_remember,
            "forget": self._handle_forget,
            "search": self._handle_search,
            "chat": self._handle_chat,
        }

        response = handlers.get(intent, self._handle_chat)(message, image_path, file_path)

        self._save_msg("assistant", response, intent)
        self._auto_remember(message, response)
        self.profile["count"] += 1
        self._save_profile()

        return {"response": response, "intent": intent}

    def _handle_chat(self, msg: str, img=None, file=None) -> str:
        memories = self.memory.search(msg, n=3)
        mem_text = ""
        if memories:
            mem_text = "\nRelevant memories:\n" + "\n".join([f"- {m['content'][:150]}" for m in memories])

        system = f"You are Snow AI — helpful, concise, intelligent. {mem_text}"
        return self._call_chat(msg, system)

    def _handle_teach(self, msg: str, img=None, file=None) -> str:
        topic = re.sub(r".*?(teach me|explain|how to|what is)\s+", "", msg, flags=re.I).strip()
        prompt = f"Teach me about {topic} in a structured way with examples."
        return self._call_chat(prompt, "You are an expert teacher. Be clear, use examples, check understanding.")

    def _handle_code(self, msg: str, img=None, file=None) -> str:
        return self._call_chat(msg, "You are a coding expert. Provide complete, working code with comments.")

    def _handle_vision(self, msg: str, image_path: str = None, file=None) -> str:
        """VISION ANALYSIS — See and understand images."""
        if not image_path or not os.path.exists(image_path):
            return "No image found. Please capture or upload an image first."

        # Detect what user wants based on message
        msg_lower = msg.lower()

        if any(w in msg_lower for w in ["diagnose", "fix", "broken", "problem", "wrong"]):
            # Mechanical/electrical diagnosis
            prompt = """Analyze this image for mechanical or electrical diagnosis:
1. What system/component is this?
2. List all visible parts with labels
3. Identify any problems (rust, leaks, breaks, corrosion, wrong connections)
4. Rank possible causes by probability
5. Suggest diagnostic steps
6. Provide repair recommendations
7. Flag any safety hazards"""

        elif any(w in msg_lower for w in ["teach", "explain", "what is this", "how does"]):
            # Educational analysis
            prompt = """Analyze this image for teaching purposes:
1. What is the main subject?
2. Identify and label all visible components/parts
3. Explain how it works
4. Key concepts to understand
5. Common mistakes or misconceptions
6. Related topics to learn next"""

        elif any(w in msg_lower for w in ["read", "text", "what does it say", "label"]):
            # OCR / text reading
            prompt = "Extract and transcribe ALL text visible in this image. Preserve formatting. Include labels, numbers, warnings, and small text."

        else:
            # General vision analysis
            prompt = """Describe what you see in this image in detail:
1. Main subject and scene
2. All visible objects and components
3. Colors, textures, and materials
4. Any text or labels
5. Condition (new, worn, damaged, etc.)
6. Context and purpose of what you see"""

        if self.has_vision:
            result = self._call_vision(image_path, prompt)
            # Save to memory
            self.memory.add(f"Vision analysis: {msg} | Result: {result[:200]}", {"type": "vision"})
            return result
        else:
            return f"""📷 Vision Model Not Loaded

I received your image but I can't analyze it yet.

To enable vision analysis, I need two local files (~1.6GB total):
1. A vision-capable GGUF model
2. Its matching mmproj (projector) file — a single .gguf isn't enough

Place them at:
  {self.VISION_MODEL_PATH}
  {self.VISION_MMPROJ_PATH}
then restart Snow AI.

Without them, describe what you see and I'll help!"""

    def _handle_screen(self, msg: str, img=None, file=None) -> str:
        try:
            from PIL import ImageGrab
            img = ImageGrab.grab()
            path = str(self.data_dir / "screen.png")
            img.save(path)
            return self._handle_vision("Look at my screen", path)
        except:
            return "Screen capture requires Pillow. Install: pip install Pillow"

    def _handle_file(self, msg: str, img=None, file_path: str = None) -> str:
        if not file_path or not os.path.exists(file_path):
            return "File not found."

        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ""
                    for page in reader.pages[:10]:
                        text += page.extract_text() or ""

                prompt = f"Teach me the key concepts from this document:\n\n{text[:4000]}"
                return self._call_chat(prompt, "Summarize and teach the main ideas clearly.")
            except:
                return "Install PyPDF2: pip install PyPDF2"

        elif ext in [".txt", ".md", ".py", ".js", ".html", ".css"]:
            with open(file_path, 'r', errors='ignore') as f:
                text = f.read()[:4000]
            prompt = f"Teach me from this file:\n\n{text}"
            return self._call_chat(prompt, "Teach the content clearly.")

        elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
            return self._handle_vision(msg or "Analyze this image", file_path)

        return f"File type '{ext}' not supported. I can read: PDF, TXT, MD, code files, images."

    def _handle_remember(self, msg: str, img=None, file=None) -> str:
        content = re.sub(r".*?(remember|save this|don't forget)\s+", "", msg, flags=re.I).strip()
        self.memory.add(content, {"type": "fact"})
        return f"✅ Remembered: '{content[:100]}...'"

    def _handle_forget(self, msg: str, img=None, file=None) -> str:
        query = re.sub(r".*?(forget|delete|remove)\s+", "", msg, flags=re.I).strip()
        deleted = 0
        for i in range(len(self.memory.docs) - 1, -1, -1):
            if query.lower() in self.memory.docs[i]["c"].lower():
                self.memory.delete(i)
                deleted += 1
        return f"🗑️ Deleted {deleted} memories about '{query}'."

    def _handle_search(self, msg: str, img=None, file=None) -> str:
        query = re.sub(r".*?(search|find|recall)\s+", "", msg, flags=re.I).strip()
        results = self.memory.search(query, n=5)
        if not results:
            return "🔍 No memories found."
        resp = "📚 What I remember:\n\n"
        for i, r in enumerate(results, 1):
            resp += f"{i}. {r['content'][:200]}...\n"
        return resp

    def _save_msg(self, role: str, content: str, intent: str):
        conn = sqlite3.connect(str(self.db_path))
        c = conn.cursor()
        c.execute("INSERT INTO msgs VALUES (NULL,?,?,?,?)",
                  (role, content, intent, datetime.now().isoformat()))
        conn.commit()
        conn.close()

    def _auto_remember(self, user_msg: str, assistant_msg: str):
        text = f"{user_msg} {assistant_msg}".lower()
        triggers = ["my name is", "i am", "i like", "i prefer", "i work as", "i'm learning", "i need help with"]
        for t in triggers:
            if t in text:
                self.memory.add(f"User: {user_msg}", {"type": "fact"})
                break

    def get_stats(self) -> Dict:
        return {
            "memories": self.memory.count(),
            "interactions": self.profile["count"],
            "chat_model": self.CHAT_MODEL_PATH if self.has_chat else "Not loaded",
            "vision_model": self.VISION_MODEL_PATH if self.has_vision else "Not loaded",
            "status": "active"
        }

    def forget_all(self) -> str:
        self.memory.clear()
        conn = sqlite3.connect(str(self.db_path))
        c = conn.cursor()
        c.execute("DELETE FROM msgs")
        conn.commit()
        conn.close()
        self.profile = {"style": "adaptive", "level": {}, "count": 0, "topics": []}
        self._save_profile()
        return "🗑️ All memories erased. Starting fresh."


if __name__ == "__main__":
    brain = SnowBrain()
    print(brain.process("Teach me about engines"))
