import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { MobilePlatformBridge } from './MobilePlatformBridge';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  return {
    Paths: { cache: 'file:///mock-cache/' },
    File: jest.fn().mockImplementation((uri: string) => ({
      uri,
      text: jest.fn().mockResolvedValue('{"mock":"content"}'),
      writableStream: jest.fn().mockReturnValue({
        getWriter: () => ({
          write: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    })),
  };
});

describe('MobilePlatformBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles openFile when file is selected', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: 'JNbotBackup.json',
          uri: 'file:///data/cache/JNbotBackup.json',
          size: 1024,
        },
      ],
    });

    const res = await MobilePlatformBridge.openFile({
      title: 'Open backup',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    expect(res.canceled).toBe(false);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].name).toBe('JNbotBackup.json');
    expect(res.files[0].content).toBe('{"mock":"content"}');
  });

  it('handles openFile cancellation', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    const res = await MobilePlatformBridge.openFile();
    expect(res.canceled).toBe(true);
    expect(res.files).toEqual([]);
  });

  it('handles saveFile cleanly', async () => {
    const res = await MobilePlatformBridge.saveFile({
      defaultName: 'export.json',
      content: '{"data":1}',
    });

    expect(res.canceled).toBe(false);
    expect(res.path).toBeDefined();
  });

  it('handles confirmPrompt when confirmed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === 'Confirm' || b.style !== 'cancel');
      confirmButton?.onPress?.();
    });

    const result = await MobilePlatformBridge.confirmPrompt({
      title: 'Import',
      message: 'Overwrite data?',
      confirmLabel: 'Confirm',
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('handles confirmPrompt when canceled', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const cancelButton = buttons?.find((b) => b.style === 'cancel' || b.text === 'Cancel');
      cancelButton?.onPress?.();
    });

    const result = await MobilePlatformBridge.confirmPrompt({
      title: 'Import',
      message: 'Overwrite data?',
    });

    expect(result).toBe(false);
  });

  it('binds platform subscriptions to messenger', () => {
    const subMock = jest.fn();
    const mockMessenger = {
      address: 42,
      sub: subMock,
    } as any;

    const unsub = MobilePlatformBridge.bindMessenger(mockMessenger);
    expect(subMock).toHaveBeenCalledWith('platform:open-file', 42, expect.any(Function));
    expect(subMock).toHaveBeenCalledWith('platform:save-file', 42, expect.any(Function));
    expect(subMock).toHaveBeenCalledWith('platform:confirm', 42, expect.any(Function));
    expect(typeof unsub).toBe('function');
  });
});
