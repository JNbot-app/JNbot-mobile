jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { getGettingStartedSteps } from './gettingStarted';

const empty = { accounts: 0, botsJoined: 0, scriptsStarted: 0, liveBots: 0, runningScripts: 0 };
const doneIds = (progress: typeof empty) =>
  getGettingStartedSteps(progress).filter((step) => step.done).map((step) => step.id);

describe('getGettingStartedSteps', () => {
  it('only marks the server done on a fresh profile', () => {
    expect(doneIds(empty)).toEqual(['server']);
  });

  it('counts live bots and running scripts before stats catch up', () => {
    expect(doneIds({ ...empty, accounts: 1, liveBots: 1, runningScripts: 1 })).toEqual(['server', 'account', 'bot', 'script']);
  });

  it('uses lifetime stats once bots have left', () => {
    expect(doneIds({ ...empty, botsJoined: 3 })).toEqual(['server', 'bot']);
  });
});
