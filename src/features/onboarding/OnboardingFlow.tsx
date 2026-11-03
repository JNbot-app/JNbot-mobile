import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useConnection } from '../../net/ConnectionProvider';
import { CreateProfileView } from '../profiles/CreateProfileView';
import { ImportDesktopView } from '../profiles/ImportDesktopView';
import { AccountStep } from './AccountStep';
import { DesktopStep } from './DesktopStep';
import { JoinStep } from './JoinStep';
import { ServerStep } from './ServerStep';
import { WelcomeStep } from './WelcomeStep';

type Stage = 'welcome' | 'desktop' | 'import' | 'server' | 'create' | 'account' | 'join';

/** First-run flow on a fresh phone runtime: desktop users import or pair, new users get a 3-step setup. */
export function OnboardingFlow() {
  const router = useRouter();
  const { createProfile } = useConnection();
  const [stage, setStage] = useState<Stage>('welcome');
  const finish = () => router.replace('/(app)/dashboard');

  switch (stage) {
    case 'welcome':
      return <WelcomeStep onDesktop={() => setStage('desktop')} onNew={() => setStage('server')} />;
    case 'desktop':
      return (
        <DesktopStep
          onBack={() => setStage('welcome')}
          onImport={() => setStage('import')}
          onRemote={() => router.push('/scan')}
          onStartFresh={() => setStage('server')}
        />
      );
    case 'import':
      return <ImportDesktopView onBack={() => setStage('desktop')} onImported={finish} />;
    case 'server':
      return (
        <ServerStep
          onBack={() => setStage('welcome')}
          onCreate={() => setStage('create')}
          onAdded={() => setStage('account')}
        />
      );
    case 'create':
      return (
        <CreateProfileView
          createProfile={createProfile}
          onBack={() => setStage('server')}
          onCreated={() => setStage('account')}
        />
      );
    case 'account':
      return <AccountStep onContinue={() => setStage('join')} onSkip={finish} />;
    case 'join':
      return <JoinStep onBack={() => setStage('account')} onSkip={finish} />;
  }
}
