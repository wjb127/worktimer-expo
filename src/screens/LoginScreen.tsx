import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { apiJson } from '../lib/api/client';
import { useAuth } from '../lib/auth/AuthContext';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type Pair = { accessToken: string; refreshToken: string };

export default function LoginScreen() {
  const { signInWithTokens } = useAuth();
  const [busy, setBusy] = useState(false);

  const google = async () => {
    try {
      setBusy(true);
      await GoogleSignin.hasPlayServices();
      const info = await GoogleSignin.signIn();
      const idToken = info.data?.idToken;
      if (!idToken) throw new Error('no idToken');
      const pair = await apiJson<Pair>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e) {
      Alert.alert('구글 로그인 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
    try {
      setBusy(true);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('no identityToken');
      const pair = await apiJson<Pair>('/auth/apple', {
        method: 'POST',
        body: JSON.stringify({ identityToken: cred.identityToken }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('애플 로그인 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  // 개발/E2E 전용 우회 로그인 (__DEV__ 빌드에만 노출, 운영 빌드엔 없음)
  const devLogin = async () => {
    try {
      setBusy(true);
      const pair = await apiJson<Pair>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email: 'e2e@codeatlas.test' }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e) {
      Alert.alert('dev 로그인 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WorkTimer</Text>
      <Text style={styles.sub}>로그인하고 어디서든 기록을 이어가세요</Text>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={
            AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={8}
          style={styles.appleBtn}
          onPress={apple}
        />
      )}

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={google}
        disabled={busy}
      >
        <Text style={styles.googleText}>Google로 계속하기</Text>
      </TouchableOpacity>

      {(__DEV__ || process.env.EXPO_PUBLIC_E2E === '1') && (
        <TouchableOpacity
          style={styles.devBtn}
          onPress={devLogin}
          disabled={busy}
          testID="dev-login-button"
          accessibilityLabel="개발자 로그인"
        >
          <Text style={styles.devText}>개발자 로그인 (E2E)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 34, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', marginBottom: 40 },
  appleBtn: { width: 260, height: 48, marginBottom: 12 },
  googleBtn: {
    width: 260,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  googleText: { fontSize: 16, fontWeight: '600', color: '#222' },
  devBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
  },
  devText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
