import { RemoteJNbotRuntime } from './RemoteJNbotRuntime';
import { parsePairingUrl } from './pairing';
import type { InstanceTransferChunk, InstanceTransferManifest } from '../generated/client-contract/mobileClientContract';
import type { InstanceImportResult } from './types';

let scannedPairingUrl: string | null = null;

export const setScannedInstanceImportUrl = (url: string) => { scannedPairingUrl = url; };
export const consumeScannedInstanceImportUrl = () => {
  const value = scannedPairingUrl;
  scannedPairingUrl = null;
  return value;
};

export type InstanceTransferStage = 'Connecting' | 'Waiting for desktop approval' | 'Preparing backup' | 'Downloading' | 'Verifying' | 'Finishing';

export type InstanceTransferReceiver = {
  beginInstanceTransfer(manifest: InstanceTransferManifest): Promise<void>;
  appendInstanceTransfer(chunk: InstanceTransferChunk): Promise<void>;
  finishInstanceTransfer(): Promise<InstanceImportResult>;
  cancelInstanceTransfer(): Promise<unknown>;
};

let nextRequestId = 0;

export async function importInstanceTransfer(
  pairingUrl: string,
  receiver: InstanceTransferReceiver,
  onStage: (stage: InstanceTransferStage, percent?: number) => void,
): Promise<InstanceImportResult> {
  const runtime = new RemoteJNbotRuntime(parsePairingUrl(pairingUrl));
  let transferId: string | null = null;
  let receiving = false;
  try {
    onStage('Connecting');
    await runtime.start();
    const capabilities = (await runtime.getBootstrap()).capabilities ?? [];
    if (!capabilities.includes('instance.direct-transfer'))
      throw new Error('Update JNbot Desktop to import directly. You can still use cloud or a backup file.');
    onStage('Waiting for desktop approval');
    const result = await runtime.requestInstanceTransfer(`mobile-${Date.now()}-${++nextRequestId}`);
    if (result.status !== 'approved')
      throw new Error(result.status === 'denied' ? 'The desktop denied this transfer.' : 'The desktop transfer request expired.');
    transferId = result.manifest.transferId;
    onStage('Preparing backup');
    await receiver.beginInstanceTransfer(result.manifest);
    receiving = true;
    for (let index = 0; index < result.manifest.chunkCount; index += 1) {
      const chunk = await readChunk(runtime, transferId, index);
      await receiver.appendInstanceTransfer(chunk);
      onStage('Downloading', Math.round(((index + 1) / result.manifest.chunkCount) * 100));
    }
    onStage('Verifying');
    onStage('Finishing');
    const imported = await receiver.finishInstanceTransfer();
    receiving = false;
    await runtime.completeInstanceTransfer(transferId);
    transferId = null;
    return imported;
  } finally {
    if (transferId) await runtime.cancelInstanceTransfer(transferId).catch(() => undefined);
    if (receiving) await receiver.cancelInstanceTransfer().catch(() => undefined);
    runtime.disconnect();
  }
}

async function readChunk(runtime: RemoteJNbotRuntime, transferId: string, index: number): Promise<InstanceTransferChunk> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await runtime.readInstanceTransferChunk(transferId, index);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('A backup chunk could not be downloaded.');
}
