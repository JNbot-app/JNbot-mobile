jest.mock('nodejs-mobile-react-native', () => ({
  start: jest.fn(),
  channel: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn(),
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { EmbeddedNodeBridge } from './EmbeddedNodeBridge';

describe('EmbeddedNodeBridge', () => {
  it('supports the CommonJS export used by nodejs-mobile-react-native', async () => {
    const bridge = new EmbeddedNodeBridge();
    const listener = jest.fn();
    const native = require('nodejs-mobile-react-native');

    bridge.on(listener);
    await bridge.start('session-1');

    expect(native.channel.addListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(native.start).toHaveBeenCalledWith('main.js');
    expect(native.channel.send).toHaveBeenCalledWith(expect.objectContaining({ kind: 'start', session: 'session-1' }));
  });
});
