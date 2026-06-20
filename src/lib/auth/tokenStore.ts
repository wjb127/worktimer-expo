import * as SecureStore from 'expo-secure-store';

const ACCESS = 'codeatlas.accessToken';
const REFRESH = 'codeatlas.refreshToken';

export const saveTokens = async (access: string, refresh: string) => {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
};
export const getAccessToken = () => SecureStore.getItemAsync(ACCESS);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH);
export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
};
