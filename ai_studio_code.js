import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AI_BACKEND_URL } from './src/config';

const AVATAR_KEY = '@tryon_avatar';

const CLOTHES = [
  { id: null, label: 'Ingen', color: null },
  { id: 'tshirt', label: 'T-skjorte', color: '#4A90D9' },
  { id: 'sweater', label: 'Genser', color: '#8B7355' },
  { id: 'hoodie', label: 'Hettegenser', color: '#2C3E50' },
  { id: 'jacket', label: 'Jakke', color: '#1a1a1a' },
];

export default function App() {
  const [faceImage, setFaceImage] = useState(null);
  const [aiAvatar, setAiAvatar] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [selectedCloth, setSelectedCloth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadAvatar();
  }, []);

  const loadAvatar = async () => {
    try {
      const stored = await AsyncStorage.getItem(AVATAR_KEY);
      if (stored) {
        const { uri, rot, cloth, ai } = JSON.parse(stored);
        if (uri) setFaceImage(uri);
        if (ai) setAiAvatar(ai);
        if (rot !== undefined) setRotation(rot);
        if (cloth) setSelectedCloth(cloth);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Ingen tilgang', 'Gi appen tilgang til bildene.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setFaceImage(result.assets[0].uri);
      setAiAvatar(null);
    }
  };

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Ingen tilgang', 'Gi appen tilgang til kameraet.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) {
      setFaceImage(result.assets[0].uri);
      setAiAvatar(null);
    }
  };

  const generateWithAI = async () => {
    if (!faceImage) {
      Alert.alert('Mangler fjes', 'Legg til et fjesbilde først.');
      return;
    }
    setGenerating(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: faceImage,
        name: 'face.jpg',
        type: 'image/jpeg',
      });
      const res = await fetch(`${AI_BACKEND_URL}/avatar`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success && data.avatar_base64) {
        setAiAvatar(`data:image/png;base64,${data.avatar_base64}`);
      } else {
        Alert.alert('Feil', data.error || 'Kunne ikke generere avatar');
      }
    } catch (e) {
      Alert.alert('Feil', 'Kunne ikke nå AI-backend. Sjekk at den kjører på ' + AI_BACKEND_URL);
    } finally {
      setGenerating(false);
    }
  };

  const chooseSource = () => {
    Alert.alert('Legg til fjes', 'Velg hvordan du vil legge til fjeset ditt:', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Ta selfie', onPress: takePhoto },
      { text: 'Velg fra galleri', onPress: pickImage },
    ]);
  };

  const saveAvatar = async () => {
    if (!faceImage && !aiAvatar) {
      Alert.alert('Mangler avatar', 'Legg til fjes eller generer med AI.');
      return;
    }
    try {
      await AsyncStorage.setItem(AVATAR_KEY, JSON.stringify({
        uri: faceImage,
        rot: rotation,
        cloth: selectedCloth,
        ai: aiAvatar,
      }));
      Alert.alert('Lagret', 'Avataren din er lagret.');
    } catch (e) {
      Alert.alert('Feil', 'Kunne ikke lagre.');
    }
  };

  const rot = ((rotation % 360) + 360) % 360;

  if (loading) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <Text style={styles.subheader}>My Avatar</Text>

      <View style={[styles.avatarArea, { transform: [{ rotate: `${rotation}deg` }] }]}>
        {aiAvatar ? (
          <Image
            source={{ uri: aiAvatar }}
            style={styles.aiAvatar}
            resizeMode="contain"
          />
        ) : faceImage ? (
          <View style={styles.avatarComposite}>
            <View style={styles.faceCircle}>
              <Image
                source={{ uri: faceImage }}
                style={styles.faceImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.bodyWrapper}>
              <View style={styles.avatarBody} />
              {selectedCloth && (() => {
                const item = CLOTHES.find((c) => c.id === selectedCloth);
                return item?.color ? (
                  <View
                    style={[
                      styles.clothOverlay,
                      {
                        backgroundColor: item.color,
                        borderColor: item.color,
                      },
                    ]}
                  />
                ) : null;
              })()}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.placeholder} onPress={chooseSource}>
            <Ionicons name="person" size={80} color="#ccc" />
            <Text style={styles.placeholderText}>Legg til fjes for å lage avatar</Text>
            <Text style={styles.placeholderSubtext}>Trykk for å velge bilde</Text>
          </TouchableOpacity>
        )}
      </View>

      {(faceImage || aiAvatar) && (
        <>
          <View style={styles.rotationRow}>
            <Text style={styles.rotationLabel}>Rotation</Text>
            <View style={styles.rotationControls}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => setRotation((r) => r - 15)}
              >
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${(rot / 360) * 100}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={() => setRotation((r) => r + 15)}
              >
                <Ionicons name="chevron-forward" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.degrees}>{rot}°</Text>
            </View>
          </View>

          {!aiAvatar && (
            <>
              <Text style={styles.clothesLabel}>Prøv klær</Text>
              <View style={styles.clothesRow}>
            {CLOTHES.map((c) => (
              <TouchableOpacity
                key={c.id || 'none'}
                style={[
                  styles.clothBtn,
                  selectedCloth === c.id && styles.clothBtnSelected,
                  c.color && { backgroundColor: c.color },
                ]}
                onPress={() => setSelectedCloth(c.id)}
              >
                {c.color ? null : (
                  <Ionicons name="shirt-outline" size={20} color="#999" />
                )}
                <Text
                  style={[
                    styles.clothBtnText,
                    c.color && { color: '#fff' },
                    selectedCloth === c.id && styles.clothBtnTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
              </View>
            </>
          )}

          {faceImage && (
            <TouchableOpacity
              style={[styles.aiBtn, generating && styles.aiBtnDisabled]}
              onPress={generateWithAI}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.aiBtnText}>Generer avatar med AI</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.changeBtn}
            onPress={chooseSource}
          >
            <Text style={styles.changeBtnText}>Bytt fjes</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, !faceImage && !aiAvatar && styles.saveBtnDisabled]}
        onPress={saveAvatar}
        disabled={!faceImage && !aiAvatar}
      >
        <Text style={styles.saveBtnText}>Lagre avatar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subheader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    fontWeight: '600',
  },
  avatarArea: {
    width: '100%',
    minHeight: 360,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  avatarComposite: {
    alignItems: 'center',
  },
  faceCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  faceImage: {
    width: '100%',
    height: '100%',
  },
  bodyWrapper: {
    marginTop: -20,
    width: 100,
    position: 'relative',
  },
  avatarBody: {
    width: 100,
    height: 160,
    backgroundColor: '#e8e4e0',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  clothOverlay: {
    position: 'absolute',
    top: 8,
    left: 4,
    right: 4,
    height: 100,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 2,
  },
  clothesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  clothesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  clothBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 72,
    alignItems: 'center',
  },
  clothBtnSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  clothBtnText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  clothBtnTextSelected: {
    fontWeight: '600',
  },
  aiAvatar: {
    width: 280,
    height: 400,
  },
  aiBtn: {
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 16,
  },
  aiBtnDisabled: {
    opacity: 0.7,
  },
  aiBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 220,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  rotationRow: {
    width: '90%',
    marginTop: 8,
    marginBottom: 24,
  },
  rotationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  rotationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrowBtn: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  degrees: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 44,
    textAlign: 'right',
  },
  changeBtn: {
    marginBottom: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  changeBtnText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
