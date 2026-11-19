import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeIcon } from '../../components/NativeIcon';
import { Badge, Card, Txt } from '../../components/ui';
import {
  chainSteps,
  detailValue,
  type ShareDetailSection,
  type ShareItemSummary,
  type ShareOverview,
} from '../../generated/client-contract/share';
import { colors, font, spacing } from '../../theme/theme';
import { codeTextStyle } from '../../components/pluginEditor/codeTheme';
import { useServerName } from '../shares';

type Fact = [string, React.ReactNode] | false | undefined;

const STRIP_MAX_CHARS = 12;

/** Short facts sit side by side like a store's info strip; longer or richer ones fall back to rows. */
function Facts({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((fact): fact is [string, React.ReactNode] => !!fact);
  if (shown.every(([, value]) => typeof value === 'string' && value.length <= STRIP_MAX_CHARS)) {
    return (
      <Card style={styles.strip}>
        {shown.map(([label, value], index) => (
          <View key={label} style={[styles.cell, index > 0 && styles.cellDivider]}>
            <Txt variant="faint" style={styles.cellLabel}>{label}</Txt>
            <Txt variant="none" numberOfLines={1} style={styles.cellValue}>{value}</Txt>
          </View>
        ))}
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.sm }}>
      {shown.map(([label, value]) => (
        <View key={label} style={styles.fact}>
          <Txt variant="muted" style={styles.factLabel}>{label}</Txt>
          {typeof value === 'string' ? <Txt style={{ flex: 1 }} selectable>{value}</Txt> : <View style={{ flex: 1 }}>{value}</View>}
        </View>
      ))}
    </Card>
  );
}

function ItemList({ title, items }: { title: string; items: ShareItemSummary[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="label">{title}</Txt>
      <Card style={{ paddingVertical: 0 }}>
        {items.map((item, index) => (
          <View key={index} style={[styles.item, index > 0 && styles.divider]}>
            <View style={styles.itemTop}>
              <Txt numberOfLines={1} style={{ flex: 1 }}>{item.name}</Txt>
              {item.type ? <Txt variant="faint">{item.type}</Txt> : null}
            </View>
            {item.description ? <Txt variant="muted" numberOfLines={2}>{item.description}</Txt> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

function ChainSteps({ details }: { details: ShareDetailSection[] }) {
  const steps = chainSteps(details);
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="label">What it runs</Txt>
      <Card style={{ gap: 0 }}>
        {steps.map((step, index) => (
          <View key={index} style={styles.step}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              {index < steps.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: index < steps.length - 1 ? spacing.md : 0 }}>
              <Txt>{step.name}</Txt>
              <Txt variant="muted">{step.text}</Txt>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

/** A chain's setup code, readable before installing. */
function SetupCode({ code }: { code: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="label">Setup code</Txt>
      <Txt variant="muted">Runs for every account before the steps and can change how they run.</Txt>
      <Card style={styles.code}>
        <ScrollView nestedScrollEnabled style={{ maxHeight: 320 }}>
          <ScrollView horizontal>
            <Txt selectable style={codeTextStyle}>{code}</Txt>
          </ScrollView>
        </ScrollView>
      </Card>
    </View>
  );
}

const TRIGGER_FIXED_ROWS = new Set(['When', 'Cooldown', 'Runs on']);

function TriggerRule({ section }: { section: ShareDetailSection }) {
  const actions = section.rows.filter((row) => /^Action( \d+)?$/.test(row.label));
  const filters = section.rows.filter((row) => !TRIGGER_FIXED_ROWS.has(row.label) && !actions.includes(row));
  const cooldown = detailValue([section], 'Cooldown');
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={[styles.rulePart, { backgroundColor: colors.surfaceAlt }]}>
        <View style={styles.ruleLabel}>
          <NativeIcon sf="bolt.fill" material="bolt" size={14} color={colors.textMuted} />
          <Txt variant="faint">When</Txt>
        </View>
        <Txt style={{ fontWeight: '600' }}>{detailValue([section], 'When') ?? section.title}</Txt>
        {filters.map((row) => <Txt key={row.label} variant="muted">{row.label}: {row.value}</Txt>)}
      </View>
      <View style={styles.rulePart}>
        <View style={styles.ruleLabel}>
          <NativeIcon sf="arrow.right" material="arrow-forward" size={14} color={colors.textMuted} />
          <Txt variant="faint">Then</Txt>
        </View>
        {actions.map((row) => <Txt key={row.label}>{row.value}</Txt>)}
        {cooldown ? <Txt variant="muted">At most once every {cooldown}</Txt> : null}
      </View>
    </Card>
  );
}

/** What is inside a share, laid out for its kind, plus what happens after installing. */
export function ShareContents({ overview }: { overview: ShareOverview }) {
  const serverName = useServerName();
  const { kind, details, items } = overview;
  const worksOn = overview.servers.length ? overview.servers.map(serverName).join(', ') : 'Every profile';
  const requires: [string, string] = ['Needs', `${overview.minAppVersion}+`];

  let body: React.ReactNode;
  switch (kind) {
    case 'plugin':
      body = <Facts facts={[!!items[0]?.type && ['Type', items[0].type], ['Works on', worksOn], requires]} />;
      break;
    case 'bundle':
      body = (
        <>
          <ItemList title={`${items.length} plugins in this bundle`} items={items} />
          <Facts facts={[['Folder', overview.title], ['Works on', worksOn], requires]} />
        </>
      );
      break;
    case 'profile': {
      const gamemodes = detailValue(details, 'Gamemodes')?.split(', ') ?? [];
      body = (
        <>
          <Facts
            facts={[
              ['Server', detailValue(details, 'Server') ?? '—'],
              !!gamemodes.length && ['Gamemodes', <View style={styles.badges}>{gamemodes.map((mode) => <Badge key={mode} label={mode} />)}</View>],
              requires,
            ]}
          />
          {items.length ? <ItemList title={`${items.length} scripts included`} items={items} /> : null}
        </>
      );
      break;
    }
    case 'chain': {
      const setup = details.find((section) => section.code !== undefined)?.code;
      body = (
        <>
          <ChainSteps details={details} />
          {setup !== undefined ? <SetupCode code={setup} /> : null}
          <Facts facts={[!!detailValue(details, 'Gamemode') && ['Gamemode', detailValue(details, 'Gamemode')], ['Works on', worksOn], requires]} />
        </>
      );
      break;
    }
    case 'trigger':
      body = (
        <>
          {details.map((section, index) => <TriggerRule key={index} section={section} />)}
          <Facts facts={[['Works on', worksOn], requires]} />
        </>
      );
      break;
  }

  return (
    <>
      {body}
      {overview.stripped?.length ? (
        <Txt variant="muted">The publisher's own {overview.stripped.join(', ')} were removed before sharing.</Txt>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: 0 },
  code: { padding: spacing.md },
  cell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm },
  cellDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  cellLabel: { textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: font.weight.semibold },
  cellValue: { textAlign: 'center', fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  fact: { flexDirection: 'row', gap: spacing.md },
  factLabel: { width: 84 },
  item: { paddingVertical: spacing.sm, gap: 2 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 10, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: colors.primary },
  line: { flex: 1, width: 2, marginTop: 4, backgroundColor: colors.borderSubtle },
  rulePart: { padding: spacing.md, gap: 4 },
  ruleLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
