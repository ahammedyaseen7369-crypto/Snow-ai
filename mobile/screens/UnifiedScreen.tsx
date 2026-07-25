import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal,
  ActivityIndicator, Alert
} from 'react-native';
import { useSnow } from '../store/SnowContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const UnifiedScreen: React.FC = () => {
  const {
    messages, isLoading, isListening, isModelLoaded, modelProgress,
    sendMessage, sendImage, sendFile, toggleVoice, clearChat, downloadModel,
    forgetEverything, memoryStats
  } = useSnow();

  const [inputText, setInputText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = useCallback(() => {
    if (inputText.trim()) { sendMessage(inputText); setInputText(''); }
  }, [inputText, sendMessage]);

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required for vision analysis.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) sendImage(result.assets[0].uri, 'What do you see?');
  }, [sendImage]);

  const handleFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain', 'image/*'] });
    if (!result.canceled) sendFile(result.assets[0].uri, result.assets[0].name);
  }, [sendFile]);

  const renderMsg = (msg: any) => {
    const isUser = msg.role === 'user';
    return (
      <View key={msg.id} style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (<View style={styles.avatar}><Text style={styles.avatarText}>❄️</Text></View>)}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {msg.intent && !isUser && (
            <View style={styles.intentTag}>
              <Text style={styles.intentText}>
                {msg.intent === 'vision' && '🔍 Vision'}
                {msg.intent === 'teach' && '🎓 Teaching'}
                {msg.intent === 'code' && '💻 Code'}
                {msg.intent === 'file' && '📚 File'}
                {msg.intent === 'screen' && '🖥️ Screen'}
              </Text>
            </View>
          )}
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{msg.content}</Text>
          {msg.hasImage && <View style={styles.mediaBadge}><Text style={styles.mediaText}>📷 Image</Text></View>}
          {msg.hasFile && <View style={styles.mediaBadge}><Text style={styles.mediaText}>📄 {msg.fileName}</Text></View>}
          <Text style={styles.msgTime}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.miniLogo}><Text style={styles.miniLogoText}>❄️</Text></View>
          <View>
            <Text style={styles.headerTitle}>SNOW AI</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isModelLoaded ? styles.statusOnline : styles.statusOffline]} />
              <Text style={[styles.statusText, isModelLoaded ? styles.statusOnlineText : styles.statusOfflineText]}>
                {isModelLoaded ? '🟢 AI Ready' : '🟡 Offline Mode'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowMemory(true)} style={styles.iconBtn}><Text>🧠</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.iconBtn}><Text>⚙️</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.chatArea} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeEmoji}>❄️</Text>
            <Text style={styles.welcomeTitle}>Snow AI</Text>
            <Text style={styles.welcomeSub}>Your offline AI companion. Teach me anything, show me photos, upload files — all without internet.</Text>
            {!isModelLoaded && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineTitle}>⚡ Offline Mode Active</Text>
                <Text style={styles.offlineSub}>I'm running without my AI brain. I can still manage memories and give basic responses.</Text>
                <TouchableOpacity style={styles.downloadBtn} onPress={downloadModel}>
                  <Text style={styles.downloadBtnText}>📥 Download AI Brain (~600MB)</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => sendMessage('Teach me something new')}>
                <Text style={styles.quickIcon}>🎓</Text><Text style={styles.quickText}>Teach Me</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={handleCamera}>
                <Text style={styles.quickIcon}>📷</Text><Text style={styles.quickText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={handleFile}>
                <Text style={styles.quickIcon}>📄</Text><Text style={styles.quickText}>File</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => sendMessage('Remember that I like visual explanations')}>
                <Text style={styles.quickIcon}>🧠</Text><Text style={styles.quickText}>Remember</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {messages.map(renderMsg)}
        {isLoading && (
          <View style={styles.typing}>
            <ActivityIndicator color="#00D4FF" size="small" />
            <Text style={styles.typingText}>Snow AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TouchableOpacity style={[styles.toolBtn, isListening && styles.toolBtnActive]} onPress={toggleVoice}>
          <Text style={styles.toolIcon}>{isListening ? '🔴' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={handleCamera}><Text style={styles.toolIcon}>📷</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={handleFile}><Text style={styles.toolIcon}>📎</Text></TouchableOpacity>
        <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Message Snow..." placeholderTextColor="#666" multiline />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}><Text style={styles.sendIcon}>➤</Text></TouchableOpacity>
      </View>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingName}>🧠 AI Brain</Text>
                <Text style={styles.settingDesc}>{isModelLoaded ? 'TinyLlama loaded and active' : 'Not loaded yet'}</Text>
              </View>
              <TouchableOpacity style={[styles.toggleBtn, isModelLoaded && styles.toggleBtnOn]} onPress={isModelLoaded ? clearChat : downloadModel}>
                <Text style={styles.toggleText}>{isModelLoaded ? 'ON' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingName}>💾 Storage Used</Text>
                <Text style={styles.settingDesc}>~5MB (app) + memory data</Text>
              </View>
            </View>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingName}>📥 Download Models</Text>
                <Text style={styles.settingDesc}>TinyLlama: ~600MB for chat</Text>
                <Text style={styles.settingDesc}>Vision model: separate download</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => { forgetEverything(); setShowSettings(false); }}>
              <Text style={styles.dangerText}>🗑️ Clear All Memories</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showMemory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧠 Memory Vault</Text>
              <TouchableOpacity onPress={() => setShowMemory(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Everything Snow remembers about you</Text>
            <View style={styles.memStats}>
              <View style={styles.statBox}><Text style={styles.statNum}>{memoryStats.memories}</Text><Text style={styles.statLabel}>Memories</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>{memoryStats.interactions}</Text><Text style={styles.statLabel}>Interactions</Text></View>
              <View style={styles.statBox}><Text style={styles.statNum}>{messages.length}</Text><Text style={styles.statLabel}>This session</Text></View>
            </View>
            <TouchableOpacity style={styles.dangerBtn} onPress={() => { forgetEverything(); setShowMemory(false); }}>
              <Text style={styles.dangerText}>🗑️ Forget Everything</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 48, backgroundColor: '#0A0A1A', borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', gap: 6 },
  miniLogo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00D4FF15', borderWidth: 1.5, borderColor: '#00D4FF', alignItems: 'center', justifyContent: 'center' },
  miniLogoText: { fontSize: 18 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusOnline: { backgroundColor: '#00FF88' },
  statusOffline: { backgroundColor: '#FFAA00' },
  statusText: { fontSize: 11 },
  statusOnlineText: { color: '#00FF88' },
  statusOfflineText: { color: '#FFAA00' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A3E', alignItems: 'center', justifyContent: 'center' },
  chatArea: { flex: 1, padding: 14 },
  welcome: { alignItems: 'center', marginTop: 30, paddingHorizontal: 10 },
  welcomeEmoji: { fontSize: 56, marginBottom: 12 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  welcomeSub: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  offlineBanner: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: '#FFAA0030', marginBottom: 16 },
  offlineTitle: { color: '#FFAA00', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  offlineSub: { color: '#AAA', fontSize: 12, lineHeight: 16, marginBottom: 12 },
  downloadBtn: { backgroundColor: '#00D4FF20', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#00D4FF40' },
  downloadBtnText: { color: '#00D4FF', fontSize: 13, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  quickBtn: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, alignItems: 'center', width: '23%', borderWidth: 1, borderColor: '#2A2A3E' },
  quickIcon: { fontSize: 22, marginBottom: 4 },
  quickText: { color: '#FFF', fontSize: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#00D4FF15', borderWidth: 1, borderColor: '#00D4FF40', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 14 },
  bubble: { backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A3E', borderRadius: 16, padding: 12, maxWidth: '82%' },
  bubbleUser: { backgroundColor: '#00D4FF15', borderColor: '#00D4FF40' },
  intentTag: { backgroundColor: '#00D4FF20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6, borderWidth: 1, borderColor: '#00D4FF30' },
  intentText: { color: '#00D4FF', fontSize: 10, fontWeight: '700' },
  msgText: { color: '#E0E0E0', fontSize: 14, lineHeight: 20 },
  msgTextUser: { color: '#FFFFFF' },
  msgTime: { color: '#666', fontSize: 10, marginTop: 6 },
  mediaBadge: { backgroundColor: '#0D0D1A', borderRadius: 8, padding: 8, marginTop: 8 },
  mediaText: { color: '#00D4FF', fontSize: 12 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  typingText: { color: '#00D4FF', fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 10, backgroundColor: '#0A0A1A', borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  toolBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A3E', alignItems: 'center', justifyContent: 'center' },
  toolBtnActive: { backgroundColor: '#00D4FF20', borderColor: '#00D4FF' },
  toolIcon: { fontSize: 16 },
  input: { flex: 1, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2A2A3E', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: '#FFFFFF', fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00D4FF', alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: '#000000E0', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0A0A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  modalSub: { color: '#888', fontSize: 12, marginBottom: 16 },
  closeBtn: { color: '#888', fontSize: 20 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A3E' },
  settingName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  settingDesc: { color: '#888', fontSize: 11, marginTop: 2 },
  toggleBtn: { backgroundColor: '#333', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14 },
  toggleBtnOn: { backgroundColor: '#00D4FF30', borderWidth: 1, borderColor: '#00D4FF' },
  toggleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  memStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3E' },
  statNum: { color: '#00D4FF', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 4 },
  dangerBtn: { backgroundColor: '#FF444415', borderWidth: 1, borderColor: '#FF444440', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  dangerText: { color: '#FF4444', fontWeight: '600', fontSize: 14 },
});

export default UnifiedScreen;
