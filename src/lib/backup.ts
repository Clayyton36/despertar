// Backup dos dados: exporta um arquivo .json (para salvar no Drive, WhatsApp, e-mail...)
// e importa de volta. Os módulos nativos são carregados só na hora do uso, para um APK
// antigo (sem eles) não travar ao abrir a tela de configurações.
import type * as DocumentPickerModule from 'expo-document-picker';
import type * as FileSystemModule from 'expo-file-system';
import type * as SharingModule from 'expo-sharing';

import { Player, today } from './game';

type BackupFile = { app: 'despertar'; version: 1; exportedAt: string; player: Player };

/* eslint-disable @typescript-eslint/no-require-imports -- imports sob demanda de propósito */
const fileSystem = (): typeof FileSystemModule => require('expo-file-system');
const sharing = (): typeof SharingModule => require('expo-sharing');
const documentPicker = (): typeof DocumentPickerModule => require('expo-document-picker');
/* eslint-enable @typescript-eslint/no-require-imports */

export async function exportBackup(player: Player) {
  const { File, Paths } = fileSystem();
  const Sharing = sharing();
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível neste aparelho.');

  const file = new File(Paths.cache, `despertar-backup-${today()}.json`);
  if (file.exists) file.delete();
  file.create();
  const content: BackupFile = { app: 'despertar', version: 1, exportedAt: new Date().toISOString(), player };
  file.write(JSON.stringify(content));

  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup do Despertar' });
}

// Abre o seletor de arquivos e devolve os dados do backup (ou null se o usuário cancelar).
export async function pickBackup(): Promise<Player | null> {
  const result = await documentPicker().getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;

  const { File } = fileSystem();
  const text = await new File(result.assets[0].uri).text();
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um backup válido.');
  }
  const p = data.player;
  if (data.app !== 'despertar' || !p || typeof p.name !== 'string' || typeof p.xp !== 'number' || !Array.isArray(p.weights)) {
    throw new Error('O arquivo não é um backup do Despertar.');
  }
  return p;
}
