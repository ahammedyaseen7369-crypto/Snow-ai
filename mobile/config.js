// Snow AI — runtime config
//
// During development the backend runs on your laptop, and the app runs in
// an emulator or on a physical device. Point this at wherever `python app.py`
// is actually listening.
//
//  - Android emulator talking to a backend on the same laptop: 10.0.2.2
//  - Physical device on the same Wi-Fi as your laptop: your laptop's LAN IP
//  - iOS simulator: localhost works directly
//
// This file is the only thing you should need to edit to point the app at
// a different backend.

export const API_BASE_URL = "http://10.220.162.156:8000";

export const REQUEST_TIMEOUT_MS = 30000; // TinyLlama on modest hardware can be slow
