// Passos automáticos via Health Connect (central de saúde do Android).
// Os passos vêm de quem registra no celular: Google Fit, Samsung Health, relógio etc.
import type * as HealthConnectModule from 'react-native-health-connect';
import { Platform } from 'react-native';

// O módulo nativo só existe no APK gerado depois da instalação da biblioteca.
// Num APK mais antigo ou no Expo Go o require falha, e o app segue com passos manuais.
let HealthConnect: typeof HealthConnectModule | null = null;
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- import condicional de propósito
    HealthConnect = require('react-native-health-connect');
  } catch {
    HealthConnect = null;
  }
}

export type HealthStatus = 'unsupported' | 'not-installed' | 'no-permission' | 'connected';

const STEPS_PERMISSION = { accessType: 'read', recordType: 'Steps' } as const;

async function ready() {
  if (!HealthConnect) return false;
  try {
    const status = await HealthConnect.getSdkStatus();
    if (status !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) return false;
    return await HealthConnect.initialize();
  } catch {
    // Biblioteca presente no JS mas sem o módulo nativo (APK antigo).
    HealthConnect = null;
    return false;
  }
}

export async function healthStatus(): Promise<HealthStatus> {
  if (!(await ready())) return HealthConnect ? 'not-installed' : 'unsupported';
  const granted = await HealthConnect!.getGrantedPermissions();
  return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read') ? 'connected' : 'no-permission';
}

export async function connectHealth() {
  if (!(await ready())) return false;
  const granted = await HealthConnect!.requestPermission([STEPS_PERMISSION]);
  return granted.some((p) => p.recordType === 'Steps');
}

export function openHealthSettings() {
  HealthConnect?.openHealthConnectSettings();
}

// Total de passos de hoje (da meia-noite até agora), sem contar duplicado entre apps.
export async function todaySteps() {
  if (!(await ready())) return null;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const result = await HealthConnect!.aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: midnight.toISOString(), endTime: new Date().toISOString() },
  });
  return result.COUNT_TOTAL;
}
