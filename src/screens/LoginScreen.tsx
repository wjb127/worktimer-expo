import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiJson } from '../lib/api/client';
import { useAuth } from '../lib/auth/AuthContext';
import { colors } from '../theme/colors';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type Pair = { accessToken: string; refreshToken: string };

export default function LoginScreen() {
  const { signInWithTokens } = useAuth();
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

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
        body: JSON.stringify({
          identityToken: cred.identityToken,
          authorizationCode: cred.authorizationCode ?? undefined,
        }),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('애플 로그인 실패', String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  // 게스트/데모 로그인 — 로그인 없이 앱 둘러보기 (Play 심사자 접근 · 신규 체험용)
  const guest = async () => {
    try {
      setBusy(true);
      const pair = await apiJson<Pair>('/auth/guest', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await signInWithTokens(pair.accessToken, pair.refreshToken);
    } catch (e) {
      Alert.alert('게스트 로그인 실패', String((e as Error)?.message ?? e));
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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.brand}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>필타임</Text>
        <Text style={styles.sub}>로그인하고 어디서든 기록을 이어가세요</Text>
      </View>

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

      <TouchableOpacity
        style={styles.guestBtn}
        onPress={guest}
        disabled={busy}
        accessibilityLabel="게스트로 둘러보기"
      >
        <Text style={styles.guestText}>게스트로 둘러보기</Text>
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
    backgroundColor: colors.white,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    color: colors.inkSub,
    textAlign: 'center',
  },
  appleBtn: { width: 260, height: 48, marginBottom: 12 },
  googleBtn: {
    width: 260,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  // 게스트 버튼 — 보조 톤(텍스트 버튼)으로 소셜 로그인이 1차 CTA임을 유지
  guestBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  guestText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSub,
    textDecorationLine: 'underline',
  },
  // 개발/E2E 전용 버튼 — 보조(secondary) 톤으로 1차 CTA가 아님을 명확히
  devBtn: {
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.primaryFaint,
  },
  devText: { fontSize: 13, fontWeight: '600', color: colors.primary },
});
