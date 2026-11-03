import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import type { Messenger, MessageContext } from '../generated/client-contract/messaging/Messenger';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenFileOptions {
  title?: string;
  filters?: FileFilter[];
  multiple?: boolean;
}

export interface SelectedFile {
  name: string;
  content: string;
  path?: string;
  size?: number;
}

export interface OpenFileResult {
  canceled: boolean;
  files: SelectedFile[];
}

export interface SaveFileOptions {
  title?: string;
  defaultName?: string;
  filters?: FileFilter[];
  content: string;
}

export interface SaveFileResult {
  canceled: boolean;
  path?: string;
}

export interface ConfirmPromptOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'info' | 'warning' | 'error';
}

function resolveDocumentMimeTypes(filters?: FileFilter[]): string[] {
  if (!filters || filters.length === 0) return ['*/*'];
  const types: string[] = [];
  for (const filter of filters) {
    for (const ext of filter.extensions) {
      const clean = ext.replace(/^\./, '').toLowerCase();
      if (clean === 'json') types.push('application/json');
      else if (clean === 'jnp') types.push('application/json', 'application/octet-stream');
      else if (clean === 'txt') types.push('text/plain');
    }
  }
  if (!types.length) types.push('*/*');
  return types;
}

export class MobilePlatformBridge {
  static async openFile(options?: OpenFileOptions): Promise<OpenFileResult> {
    try {
      const mimeTypes = resolveDocumentMimeTypes(options?.filters);
      const res = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        copyToCacheDirectory: true,
        multiple: options?.multiple ?? false,
      });

      if (res.canceled || !res.assets || !res.assets.length) {
        return { canceled: true, files: [] };
      }

      const files: SelectedFile[] = [];
      for (const asset of res.assets) {
        const fileRef = new File(asset.uri);
        const content = await fileRef.text();
        files.push({
          name: asset.name,
          content,
          path: asset.uri,
          size: asset.size ?? undefined,
        });
      }

      return { canceled: false, files };
    } catch (err) {
      console.warn('[MobilePlatformBridge] openFile error:', err);
      return { canceled: true, files: [] };
    }
  }

  static async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    try {
      const filename = options.defaultName || 'backup.json';
      const file = new File(Paths.cache, filename);
      const stream = file.writableStream();
      const writer = stream.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(options.content));
      await writer.close();
      return { canceled: false, path: file.uri };
    } catch (err) {
      console.warn('[MobilePlatformBridge] saveFile error:', err);
      return { canceled: true };
    }
  }

  static async confirmPrompt(options: ConfirmPromptOptions): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        options.title,
        options.message,
        [
          {
            text: options.cancelLabel ?? 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: options.confirmLabel ?? 'Confirm',
            style: options.type === 'error' || options.type === 'warning' ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  static bindMessenger(messenger: Messenger): () => void {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      messenger.sub('platform:open-file', messenger.address, async (data, context: MessageContext) => {
        const result = await MobilePlatformBridge.openFile(data as OpenFileOptions);
        context.reply(result);
      }),
    );

    unsubs.push(
      messenger.sub('platform:save-file', messenger.address, async (data, context: MessageContext) => {
        const result = await MobilePlatformBridge.saveFile(data as SaveFileOptions);
        context.reply(result);
      }),
    );

    unsubs.push(
      messenger.sub('platform:confirm', messenger.address, async (data, context: MessageContext) => {
        const result = await MobilePlatformBridge.confirmPrompt(data as ConfirmPromptOptions);
        context.reply({ confirmed: result });
      }),
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }
}
