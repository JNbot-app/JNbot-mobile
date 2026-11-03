import React, { useMemo } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { KpiGrid } from '../alt/AltKpiGrid';
import { AltRanksCard } from '../alt/AltRanksCard';
import { AltGkitsCard } from '../alt/AltGkitsCard';
import { TONE_TO_BG, TONE_TO_HEX } from '../alt/toneColors';
import { ProfileIdentityCard } from './ProfileIdentityCard';
import { ProfileStatsCard } from './ProfileStatsCard';
import { ProfileUserListCard } from './ProfileUserListCard';
import { colors } from '../../theme/theme';
import { profileUiSections } from '../../features/profileUi';
import type {
  KpiItem,
  ProfileUiJson,
  ProfileUiSection,
  RankItem,
} from '../../generated/client-contract/profileUiSchema';

/** Same icon keys desktop's KpiStrip understands. */
const KPI_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  money: 'cash-outline',
  hash: 'pricetag-outline',
  clock: 'time-outline',
  star: 'star-outline',
  trophy: 'trophy-outline',
  bolt: 'flash-outline',
};

const toKpi = (item: KpiItem) => ({
  label: item.label,
  value: item.value,
  icon: item.icon ? KPI_ICONS[item.icon] : undefined,
  color: item.tone ? TONE_TO_HEX[item.tone] : colors.textMuted,
  bg: item.tone ? TONE_TO_BG[item.tone] : colors.surfaceAlt,
});

const toRank = (item: RankItem) => ({
  gamemode: item.server ?? '',
  rank: item.name,
  color: item.tone && TONE_TO_HEX[item.tone],
  emphasis: item.emphasis,
});

function Section({
  section,
  player,
  onSelectUser,
}: {
  section: ProfileUiSection;
  player: ProfileUiJson['player'];
  onSelectUser?: (username: string) => void;
}) {
  switch (section.type) {
    case 'identity':
      return <ProfileIdentityCard player={player} data={section.data} />;
    case 'kpiStrip':
      return <KpiGrid items={section.data.items.map(toKpi)} />;
    case 'ranks':
      return <AltRanksCard ranks={section.data.items.map(toRank)} />;
    case 'stats':
      return <ProfileStatsCard data={section.data} />;
    case 'userList':
      return <ProfileUserListCard data={section.data} onSelectUser={onSelectUser} />;
    case 'gkits':
      return <AltGkitsCard groups={section.data.groups} />;
  }
}

/** Mobile renderer for a Profile UI plugin's JSON (desktop: AccountProfileView). */
export function ProfileUiView({
  json,
  onSelectUser,
}: {
  json: ProfileUiJson;
  onSelectUser?: (username: string) => void;
}) {
  const sections = useMemo(() => profileUiSections(json), [json]);
  return (
    <>
      {sections.map((section) => (
        <Section
          key={section.id}
          section={section}
          player={json.player}
          onSelectUser={onSelectUser}
        />
      ))}
    </>
  );
}
