import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  sendMessage as apiSendMessage,
  sendImage as apiSendImage,
  sendFile as apiSendFile,
  checkModelsStatus,
  checkHealth,
  forgetAllMemory,
} from "../api/snowClient";
import { SnowSpeechIO } from "../voice/speechIO";

let idCounter = 0;
const nextId = () => `msg_${++idCounter}`;

const SnowCtx = createContext(null);

export function SnowProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVisionLoaded, setIsVisionLoaded] = useState(false);
  const [memoryStats, setMemoryStats] = useState({ memories: 0, interactions: 0 });
  const speechRef = useRef(null);

  useEffect(() => {
    speechRef.current = new SnowSpeechIO({
      onFinalResult: (text) => {
        setIsListening(false);
        if (text?.trim()) sendMessage(text);
      },
      onSpeechEnd: () => setIsListening(false),
      onError: () => setIsListening(false),
    });

    let cancelled = false;
    async function poll() {
      try {
        const status = await checkModelsStatus();
        if (cancelled) return;
        setIsModelLoaded(!!status.chat_available);
        setIsVisionLoaded(!!status.vision_available);
      } catch {
        if (!cancelled) {
          setIsModelLoaded(false);
          setIsVisionLoaded(false);
        }
      }
      try {
        const health = await checkHealth();
        if (!cancelled) {
          setMemoryStats({ memories: health.memories, interactions: health.interactions });
        }
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      speechRef.current?.destroy();
    };
  }, []);

  const pushMessage = useCallback((role, content, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role, content, timestamp: new Date(), ...extra },
    ]);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    pushMessage("user", trimmed);
    setIsLoading(true);
    try {
      const { response, intent } = await apiSendMessage(trimmed);
      pushMessage("assistant", response, { intent });
      speechRef.current?.speak(response);
    } catch (err) {
      pushMessage("assistant", err.message, { intent: undefined, isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [pushMessage]);

  const sendImage = useCallback(async (uri, text = "What do you see?") => {
    pushMessage("user", text, { hasImage: true });
    setIsLoading(true);
    try {
      const { response, intent } = await apiSendImage(uri, text);
      pushMessage("assistant", response, { intent });
      speechRef.current?.speak(response);
    } catch (err) {
      pushMessage("assistant", err.message, { isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [pushMessage]);

  const sendFile = useCallback(async (uri, name, text = "Teach me this") => {
    pushMessage("user", text, { hasFile: true, fileName: name });
    setIsLoading(true);
    try {
      const { response, intent } = await apiSendFile(uri, name, text);
      pushMessage("assistant", response, { intent });
      speechRef.current?.speak(response);
    } catch (err) {
      pushMessage("assistant", err.message, { isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [pushMessage]);

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      await speechRef.current?.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      await speechRef.current?.startListening();
    }
  }, [isListening]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const forgetEverything = useCallback(async () => {
    try {
      await forgetAllMemory();
    } finally {
      setMessages([]);
    }
  }, []);

  const downloadModel = useCallback(async () => {
    pushMessage(
      "assistant",
      "Model downloads happen outside the app for now — see BUILD_APK_FROM_TABLET.md for the exact steps to place a TinyLlama GGUF file where the backend expects it.",
      { isError: false }
    );
  }, [pushMessage]);

  const value = {
    messages, isLoading, isListening, isModelLoaded, isVisionLoaded,
    memoryStats, modelProgress: 0,
    sendMessage, sendImage, sendFile, toggleVoice, clearChat,
    forgetEverything, downloadModel,
  };

  return <SnowCtx.Provider value={value}>{children}</SnowCtx.Provider>;
}

export function useSnow() {
  const ctx = useContext(SnowCtx);
  if (!ctx) throw new Error("useSnow must be used inside a SnowProvider");
  return ctx;
}
