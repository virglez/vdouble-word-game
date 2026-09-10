import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DecabloLogo, RoundBadge, RoundCards, PartyArt } from '@/components/Decablo';
import { BRAND, ROUND_COLORS } from '@/constants/colors';
import { createStyles } from '@/components/decabloStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GameProvider, TURN_LENGTH_MS, useGame, type CardCount } from '@/context/GameContext';
import { LANGUAGE_OPTIONS, UI_TEXT, type LanguageCode } from '@/data/ui_text';

const cardCountOptions: Array<{ value: CardCount; note: string }> = [
  { value: 20, note: 'cardCountQuick' },
  { value: 30, note: 'cardCountStandard' },
  { value: 40, note: 'cardCountLong' },
];

function press(action: () => void) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  action();
}

function confirmDiscardSavedGame(startNew: () => void, t: Record<string, string>) {
  Alert.alert(
    t.confirmDiscard ?? '¿Empezar una partida nueva?',
    t.confirmDiscardBody ?? 'Tienes una partida guardada en curso. Si continúas, se perderá su marcador y progreso.',
    [
      { text: t.cancel ?? 'Cancelar', style: 'cancel' },
      { text: t.newGameButton ?? 'Nueva partida', style: 'destructive', onPress: () => press(startNew) },
    ],
  );
}

const TEAM_ICONS = ['☀️', '⚡', '🔥', '⭐', '🎯', '🎮', '🌙', '🌎', '🛸', '⚙️', '🐺', '🌈'];
const TEAM_ICON_GLYPHS: React.ComponentProps<typeof Feather>['name'][] = [
  'sun', 'zap', 'activity', 'star', 'target', 'monitor',
  'moon', 'globe', 'send', 'settings', 'wind', 'cloud-rain',
];

function teamIconGlyph(icon: string): React.ComponentProps<typeof Feather>['name'] {
  return TEAM_ICON_GLYPHS[Math.max(0, TEAM_ICONS.indexOf(icon))];
}

function AppContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const game = useGame();
  const roundColor = ['instructions', 'ready', 'play', 'review', 'roundBreak'].includes(game.state.screen)
    ? ROUND_COLORS[game.state.roundIndex] : BRAND.yellow;
  const styles = useMemo(() => createStyles(colors, roundColor), [colors, roundColor]);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (game.state.screen !== 'play' || !game.state.turnEndsAt || game.state.timeUp) {
      setSeconds(game.state.timeUp ? 0 : 30);
      return undefined;
    }
    const update = () => setSeconds(Math.max(0, Math.ceil((game.state.turnEndsAt! - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [game.state.screen, game.state.timeUp, game.state.turnEndsAt]);

  if (!game.hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const content = (() => {
    switch (game.state.screen) {
      case 'setup':
        return <SetupScreen styles={styles} />;
      case 'instructions':
        return <InstructionsScreen styles={styles} />;
      case 'play':
        return <PlayScreen styles={styles} seconds={seconds} />;
      case 'review':
        return <ReviewScreen styles={styles} />;
      case 'ready':
        return <ReadyScreen styles={styles} />;
      case 'roundBreak':
        return <RoundBreakScreenRedesign styles={styles} />;
      case 'final':
        return <FinalScreen styles={styles} />;
      case 'home':
      default:
        return <HomeScreen styles={styles} />;
    }
  })();

  return (
    <ImageBackground source={require('@/assets/brand/screen-background.png')} resizeMode="cover" style={styles.background}>
    <SafeAreaView style={[styles.safe, game.state.screen === 'instructions' && { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

function HomeScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, hasSavedGame, startSetup, setLanguage } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;

  useEffect(() => {
    if (state.language !== 'es') setLanguage('es');
  }, [setLanguage, state.language]);

  return (
    <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.languageSelectorRow} />
      <View style={styles.homeHero}>
        <Image source={require('@/assets/branding/decablo-logo.png')} resizeMode="contain" style={styles.homeBrandImage} />
        <Text style={styles.claim}>{t.decabloClaim}</Text>
        <View accessible accessibilityLabel={t.cardIllustration}>
          <RoundCards labels={[t.decabloRound1, t.decabloRound2, t.decabloRound3]} rounds={[t.rulesRound1, t.rulesRound2, t.rulesRound3]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value="20/30/40" label={t.statsCards} asset={require('@/assets/icons/decablo/players.png')} styles={styles} />
        <Stat value="30 s" label={t.statsTurn} asset={require('@/assets/icons/decablo/clock.png')} styles={styles} />
        <Stat value="3" label={t.statsRounds} asset={require('@/assets/icons/decablo/repeat.png')} styles={styles} />
      </View>

      <Pressable
        testID="new-game-button"
        accessibilityRole="button"
        onPress={() => (hasSavedGame ? confirmDiscardSavedGame(startSetup, t) : press(startSetup))}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>NUEVA PARTIDA</Text>
        <View style={styles.ctaArrow}><Feather name="arrow-up-right" size={21} color={colors.primaryForeground} /></View>
      </Pressable>

    </ScrollView>
  );
}

function Stat({ value, label, asset, styles }: { value: string; label: string; asset: ImageSourcePropType; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.stat}>
      <Image source={asset} resizeMode="contain" style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ScreenHeader({
  styles,
  title,
  onBack,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  onBack?: () => void;
}) {
  const colors = useColors();
  const { state } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const onRoundSurface = state.screen === 'instructions';
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel={t.screenHeaderBack}
          onPress={() => press(onBack)}
          style={[styles.iconButton, onRoundSurface && styles.iconButtonOnRound]}
        >
          <Feather name="arrow-left" size={20} color={onRoundSurface ? BRAND.navy : colors.foreground} />
        </Pressable>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}
      <Text style={[styles.screenHeaderTitle, onRoundSurface && styles.screenHeaderTitleOnRound]}>{title}</Text>
      <View style={styles.iconButtonPlaceholder} />
    </View>
  );
}

function SetupScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, updateTeamName, updateTeamIcon, setCardCount, createGame, isCreating, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;

  return (
    <ScrollView contentContainerStyle={styles.setupScroll} keyboardShouldPersistTaps="handled">
      <View style={styles.setupTopBar}>
        <Pressable accessibilityRole="button" onPress={() => press(goHome)} style={styles.setupBackButton}>
          <Feather name="arrow-left" size={22} color={BRAND.white} />
        </Pressable>
        <Image
          source={require('@/assets/branding/decablo-logo.png')}
          resizeMode="contain"
          style={styles.setupLogo}
          accessibilityLabel="DECABLO by VDOUBLE"
        />
        <View style={styles.setupBackButtonPlaceholder} />
      </View>

      <View style={styles.setupHeadingWrap}>
        <Text style={styles.setupTitle}>PREPARA{`\n`}LA PARTIDA</Text>
        <View style={styles.setupConfettiRow}>
          <View style={[styles.setupConfetti, { backgroundColor: BRAND.coral, transform: [{ rotate: '-38deg' }] }]} />
          <View style={[styles.setupConfetti, { backgroundColor: BRAND.yellow, transform: [{ rotate: '22deg' }] }]} />
          <View style={[styles.setupConfetti, { backgroundColor: BRAND.mint, transform: [{ rotate: '-48deg' }] }]} />
        </View>
      </View>

      <View style={styles.setupTeamCards}>
        <TeamInput
          team={0}
          value={state.teams[0].name}
          icon={state.teams[0].icon}
          onChangeText={(value) => updateTeamName(0, value)}
          onIconChange={(icon) => updateTeamIcon(0, icon)}
          styles={styles}
          color={BRAND.yellow}
          language={state.language}
        />
        <TeamInput
          team={1}
          value={state.teams[1].name}
          icon={state.teams[1].icon}
          onChangeText={(value) => updateTeamName(1, value)}
          onIconChange={(icon) => updateTeamIcon(1, icon)}
          styles={styles}
          color={BRAND.mint}
          language={state.language}
        />
      </View>

      <View style={styles.setupDeckBlock}>
        <Text style={styles.setupSectionTitle}>NÚMERO DE CARTAS</Text>
        <View style={styles.setupCardCountList}>
          {cardCountOptions.map(({ value, note }) => {
            const selected = state.cardCount === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`card-count-${value}`}
                onPress={() => press(() => setCardCount(value))}
                style={[styles.setupCardCountOption, selected && styles.setupCardCountOptionSelected]}
              >
                <View style={styles.deckTileContent}>
                  <Text style={[styles.setupCardCountTitle, selected && styles.setupCardCountTitleSelected]}>
                    {value}
                  </Text>
                  <Text style={[styles.setupCardCountNote, selected && styles.setupCardCountNoteSelected]}>{t[note]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        testID="create-game-button"
        accessibilityRole="button"
        disabled={isCreating}
        accessibilityState={{ disabled: isCreating, busy: isCreating }}
        onPress={() => { void createGame().catch(() => Alert.alert(t.createGameError)); }}
        style={({ pressed }) => [styles.setupCreateButton, pressed && styles.pressed]}
      >
        <Text style={styles.setupCreateButtonText}>{isCreating ? t.creatingGame.toUpperCase() : 'CREAR MAZO'}</Text>
        <View style={styles.ctaArrow}><Feather name="arrow-right" size={21} color={colors.primaryForeground} /></View>
      </Pressable>
      <Modal visible={isCreating} transparent animationType="none" onRequestClose={() => {}}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={{ padding: 28, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', gap: 16 }} accessibilityViewIsModal>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text accessibilityLiveRegion="polite" style={styles.pageSubtitle}>{t.creatingGame}</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TeamInput({
  team,
  value,
  icon,
  onChangeText,
  onIconChange,
  styles,
  color,
  language,
}: {
  team: 0 | 1;
  value: string;
  icon: string;
  onChangeText: (value: string) => void;
  onIconChange: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
  color: string;
  language: LanguageCode;
}) {
  const t = UI_TEXT[language] ?? UI_TEXT.es;
  const start = team === 0 ? 0 : 6;
  const candidates = TEAM_ICONS.slice(start, start + 6);
  const selectedIndex = Math.max(0, TEAM_ICONS.indexOf(icon));
  return (
    <View style={[styles.setupTeamCard, { backgroundColor: color }]}>
      <View style={styles.setupTeamMainRow}>
        <View style={styles.setupTeamAvatar}>
          <Feather name={TEAM_ICON_GLYPHS[selectedIndex]} size={58} color={BRAND.navy} />
          <View style={styles.setupAvatarBurst} />
        </View>
        <View style={styles.setupTeamFieldColumn}>
          <Text style={styles.setupTeamTitle}>EQUIPO {team === 0 ? 'A' : 'B'}</Text>
          <View style={styles.setupTeamInputShell}>
            <TextInput
              testID={`team-${team}-input`}
              value={value}
              onChangeText={onChangeText}
              placeholder={t.teamCreateIntro.replace('{n}', String(team + 1))}
              placeholderTextColor={styles.placeholder.color}
              maxLength={24}
              style={styles.setupTeamInput}
              returnKeyType="done"
            />
            <Feather name="edit-3" size={21} color="#7392A7" />
          </View>
        </View>
      </View>
      <Text style={styles.setupPickerLabel}>ELIGE UN ÍCONO</Text>
      <View style={styles.setupTeamIconPicker}>
        {candidates.map((candidate) => {
          const candidateIndex = TEAM_ICONS.indexOf(candidate);
          return (
          <Pressable
            key={`${team}-${candidate}`}
            accessibilityRole="button"
            accessibilityLabel={t.teamIconPickerLabel.replace('{icon}', candidate).replace('{n}', String(team + 1))}
            onPress={() => press(() => onIconChange(candidate))}
            style={({ pressed }) => [
              styles.setupTeamIconOption,
              candidate === icon && styles.setupTeamIconOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <Feather name={TEAM_ICON_GLYPHS[candidateIndex]} size={27} color={BRAND.navy} />
          </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function InstructionsScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, startRound, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const roundNumber = state.roundIndex + 1;
  const roundNameText = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex] ?? t.rulesTitle1;
  const copy = [
    t.rulesDescription1,
    t.rulesDescription2,
    t.rulesDescription3,
  ][state.roundIndex] ?? t.rulesDescription1;

  return (
    <ScrollView contentContainerStyle={styles.instructionsRoundOneScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => press(goHome)} style={styles.backFloating}>
        <Feather name="arrow-left" size={22} color={BRAND.white} />
      </Pressable>
      <Image
        source={require('@/assets/branding/decablo-logo.png')}
        resizeMode="contain"
        style={styles.instructionsLogo}
        accessibilityLabel="DECABLO by VDOUBLE"
      />
      {state.roundIndex <= 2 ? (
        <Image source={state.roundIndex === 0 ? require('@/assets/rounds/round1-rules.png') : state.roundIndex === 1 ? require('@/assets/rounds/round2-rules.png') : require('@/assets/rounds/round3-rules.png')} resizeMode="contain" style={styles.instructionsRoundOneArt} />
      ) : (
        <>
          <Text style={styles.roundInstructionLabel}>{t.instructionsRound.replace('{n}', String(roundNumber))}</Text>
          <View style={styles.roundHero}>
            <View style={styles.roundHeroIcon}>
              <Feather name={state.roundIndex === 1 ? 'zap' : 'smile'} size={60} color={ROUND_COLORS[state.roundIndex]} />
            </View>
            <Text style={styles.roundHeroTitle}>{[t.decabloRound1, t.decabloRound2, t.decabloRound3][state.roundIndex]}</Text>
          </View>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionBody}>{copy}</Text>
            <View style={styles.durationPill}>
              <Feather name="clock" size={18} color={BRAND.navy} />
              <Text style={styles.durationText}>{t.instructionDuration}</Text>
            </View>
            <Text style={styles.instructionBody}>{t.instructionsBody}</Text>
          </View>
        </>
      )}

      <Pressable
        testID="start-round-button"
        accessibilityRole="button"
        onPress={() => press(startRound)}
        style={({ pressed }) => [styles.primaryButton, styles.instructionsStartButton, pressed && styles.pressed]}
      >
        <Text style={styles.instructionsStartButtonText}>EMPIEZA {state.teams[state.currentTeam].name.toUpperCase()}</Text>
        <View style={styles.ctaArrow}><Feather name="arrow-right" size={19} color={BRAND.navy} /></View>
      </Pressable>
    </ScrollView>
  );
}

function ReviewScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, correctReview, confirmReview, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const correct = state.review.filter(item => item.correct).length;
  const nextTeam = state.teams[state.currentTeam === 0 ? 1 : 0].name;
  return (
    <View style={styles.flex}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => press(goHome)} style={styles.backFloating}>
        <Feather name="arrow-left" size={22} color={BRAND.white} />
      </Pressable>
      <ScrollView contentContainerStyle={styles.pageScroll}>
        <Image source={require('@/assets/reference-parts/tiempo.png')} resizeMode="contain" style={styles.timeUpArt} />
        <Text style={styles.pageSubtitle}>{t.reviewTitle}</Text>
        <Text style={styles.pageSubtitle}>{t.reviewSubtitle.replace('{team}', state.teams[state.currentTeam].name)}</Text>
        <View style={styles.reviewSummary}>
          <Text style={styles.reviewPoints}>+{correct}</Text>
          <Text style={styles.reviewSummaryText}>{correct} {t.scoreboardCorrect} · +{correct} {t.scoreboardPoints}</Text>
          <Text style={styles.reviewSummaryNote}>{state.review.length - correct} {t.scoreboardPassed}</Text>
        </View>
        <View style={styles.checklist}>
          {state.review.length === 0 && <Text style={[styles.pageSubtitle, { padding: 20 }]}>{t.reviewNoCard}</Text>}
          {state.review.map((item, index) => (
            <Pressable key={item.word} accessibilityRole="checkbox"
              accessibilityState={{ checked: item.correct }}
              accessibilityLabel={`${item.word}: ${item.correct ? t.cardStatusCorrect : t.cardStatusPassed}`}
              accessibilityHint={t.reviewEditHint}
              onPress={() => press(() => correctReview(item.word))}
              style={({ pressed }) => [styles.checkRow, item.correct && styles.checkRowCorrect,
                index === state.review.length - 1 && { borderBottomWidth: 0 }, pressed && styles.pressed]}>
              <View style={[styles.checkBox, item.correct && styles.checkBoxCorrect]}>
                <Feather name={item.correct ? 'check' : 'minus'} size={19} color={item.correct ? BRAND.navy : BRAND.coral} />
              </View>
              <Text style={styles.checkWord}>{item.word}</Text>
              <Text style={[styles.checkStatus, item.correct && styles.checkStatusCorrect]}>{item.correct ? t.cardStatusCorrect : t.cardStatusPassed}</Text>
            </Pressable>
          ))}
        </View>
        {state.remaining.length > 0 ? (
          <Text style={styles.reviewWarning}>Asegúrate de darle a <Text style={styles.reviewWarningStrong}>SIGUIENTE</Text> antes de pasar el móvil al equipo <Text style={styles.reviewWarningStrong}>{nextTeam}</Text></Text>
        ) : null}
        <ScoreStrip styles={styles} />
      </ScrollView>
      <View style={styles.reviewFooter}>
        <Pressable accessibilityRole="button" onPress={() => press(confirmReview)} style={[styles.primaryButton, styles.reviewPrimaryButton]}>
          <Text style={[styles.primaryButtonText, { flex: 1, textAlign: 'center' }]}>SIGUIENTE</Text>
          <View style={styles.ctaArrow}><Feather name="arrow-right" size={21} color={BRAND.navy} /></View>
        </Pressable>
      </View>
    </View>
  );
}

function ReadyScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, continueTurn, goHome } = useGame();
  const activeTeam = state.teams[state.currentTeam];
  return (
    <ScrollView contentContainerStyle={styles.readyScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => press(goHome)} style={styles.backFloating}>
        <Feather name="arrow-left" size={22} color={BRAND.white} />
      </Pressable>
      <View style={styles.readyHeader}>
        <Image
          source={require('@/assets/branding/decablo-logo.png')}
          resizeMode="contain"
          style={styles.readyLogo}
          accessibilityLabel="DECABLO by VDOUBLE"
        />
        <View style={styles.readyScoreboard} accessibilityLabel={`${state.teams[0].name} ${state.teams[0].score}, ${state.teams[1].name} ${state.teams[1].score}`}>
          {state.teams.map((team, index) => (
            <React.Fragment key={`ready-score-${index}`}>
              {index > 0 ? <View style={styles.readyScoreDivider} /> : null}
              <View style={styles.readyScoreTeam}>
                <Feather name={teamIconGlyph(team.icon)} size={28} color={index === 0 ? BRAND.yellow : BRAND.coral} />
                <Text style={styles.readyScoreValue}>{team.score}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.readyMain}>
        <Text style={styles.readyHeadline}>PASA EL <Text style={styles.readyHeadlineAccent}>MÓVIL</Text></Text>
        <Image
          source={require('@/assets/illustrations/pass-phone.png')}
          resizeMode="contain"
          style={styles.readyPhoneArt}
          accessibilityLabel="Dos manos pasando un teléfono"
        />
        <Text style={styles.readyTeamLabel}>EQUIPO</Text>
        <Text style={styles.readyTeamName}>{activeTeam.name.toUpperCase()}</Text>
        <View style={styles.readyPrivacyRow}>
          <Feather name="lock" size={30} color={BRAND.white} />
          <Text style={styles.readyPrivacyText}>Que nadie mire{`\n`}la pantalla</Text>
        </View>
      </View>

      <Pressable testID="ready-start-button" accessibilityRole="button" onPress={() => press(continueTurn)} style={({ pressed }) => [styles.readyButton, pressed && styles.pressed]}>
        <Text style={styles.readyButtonText}>ESTOY LISTA</Text>
        <View style={styles.ctaArrow}><Feather name="arrow-right" size={22} color={BRAND.navy} /></View>
      </Pressable>
    </ScrollView>
  );
}

function ScoreStrip({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state } = useGame();
  return (
    <View style={styles.scoreStrip}>
      <View style={styles.scoreTeam}>
        <View style={styles.scoreTeamNameRow}>
          <Text style={styles.scoreTeamIcon}>{state.teams[0].icon}</Text>
          <Text style={styles.scoreTeamName} numberOfLines={1}>{state.teams[0].name}</Text>
        </View>
        <Text style={styles.scoreNumber}>{state.teams[0].score}</Text>
      </View>
      <Text style={styles.scoreDivider}>—</Text>
      <View style={[styles.scoreTeam, styles.scoreTeamRight]}>
        <View style={styles.scoreTeamNameRowRight}>
          <Text style={styles.scoreTeamIcon}>{state.teams[1].icon}</Text>
          <Text style={styles.scoreTeamName} numberOfLines={1}>{state.teams[1].name}</Text>
        </View>
        <Text style={styles.scoreNumber}>{state.teams[1].score}</Text>
      </View>
    </View>
  );
}

function PlayScreen({ styles, seconds }: { styles: ReturnType<typeof createStyles>; seconds: number }) {
  const colors = useColors();
  const { state, currentCard, markCorrect, passCard, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const activeTeam = state.teams[state.currentTeam];
  const progress = Math.max(0, state.remaining.length);
  const timerProgress = Math.max(0, Math.min(1, seconds / (TURN_LENGTH_MS / 1000)));
  const roundNameText = [t.decabloRound1, t.decabloRound2, t.decabloRound3][state.roundIndex] ?? t.rulesTitle1;

  return (
    <ScrollView contentContainerStyle={styles.gameScreen} showsVerticalScrollIndicator={false}>
      <View style={styles.playLogo}><DecabloLogo compact /></View>
      <View style={styles.playHeader}>
        <View style={styles.playTeamHeader}>
          <Text style={styles.playRound}>{roundNameText.toUpperCase()} · {t.roundTable} {state.roundIndex + 1}</Text>
          <View style={styles.activeTeamNameRow}>
            <Text style={styles.activeTeamIcon}>{activeTeam.icon}</Text>
            <Text style={styles.activeTeam}>{activeTeam.name}</Text>
          </View>
        </View>
        <View style={styles.playHeaderActions}>
          <View style={[styles.timer, seconds <= 5 && !state.timeUp && styles.timerDanger]}>
            <Text style={styles.timerNumber}>{state.timeUp ? '0' : seconds}</Text>
            <Text style={styles.timerLabel}>{t.cardTimerUnit}</Text>
          </View>
          <Pressable
            testID="exit-play-button"
            accessibilityRole="button"
            accessibilityLabel={t.exitGame}
            onPress={() => press(goHome)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Feather name="home" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${timerProgress * 100}%` }]} />
      </View>

      <View style={styles.playCenter}>
        <Text style={styles.cardOverline}>{t.cardOfCount.replace('{n}', String(state.deck.length - progress + 1)).replace('{total}', String(state.deck.length))}</Text>
        <View style={styles.wordCard}>
          {currentCard ? (
            <>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardCategory}>{currentCard.categoryTranslations?.[state.language] ?? currentCard.categoria}</Text>
                <View style={styles.cardDot} />
                <Text style={styles.cardCategory}>{(currentCard.subcategoryTranslations?.[state.language] ?? currentCard.subcategoria) || t.cardCultureSubcategory}</Text>
              </View>
              <Text style={styles.wordText}>{currentCard.palabra}</Text>
            </>
          ) : (
            <Text style={styles.wordText}>{t.cardCurrent}</Text>
          )}
        </View>
        <View style={styles.remainingRow}><Feather name="layers" size={22} color={BRAND.white} /><Text style={styles.remainingText}>Quedan <Text style={styles.remainingCount}>{progress}</Text> cartas</Text></View>
      </View>

      <View style={styles.playActions}>
        <Pressable
          testID="pass-card-button"
          accessibilityRole="button"
          onPress={() => press(passCard)}
          style={({ pressed }) => [styles.passButton, pressed && styles.pressed]}
        >
          <Feather name="skip-forward" size={19} color={colors.foreground} />
          <Text style={styles.passButtonText}>{t.passCard}</Text>
        </Pressable>
        <Pressable
          testID="correct-card-button"
          accessibilityRole="button"
          onPress={() => press(markCorrect)}
          style={({ pressed }) => [styles.correctButton, pressed && styles.pressed]}
        >
          <Feather name="check" size={20} color={BRAND.white} />
          <Text style={styles.correctButtonText}>{t.cardStatusCorrect}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RoundBreakScreenRedesign({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, startRound, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const nextRound = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex + 1] ?? t.rulesTitle1;
  const completedScores = state.roundScores[state.roundIndex];
  return (
    <ScrollView contentContainerStyle={styles.roundBreakScroll}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => press(goHome)} style={styles.backFloating}>
        <Feather name="arrow-left" size={22} color={BRAND.white} />
      </Pressable>
      {state.roundIndex === 0 ? (
        <Image source={require('@/assets/rounds/round1-completed.png')} resizeMode="contain" style={styles.roundBreakHeroArt} />
      ) : (
        <>
          <Image source={require('@/assets/branding/decablo-logo.png')} resizeMode="contain" style={styles.roundBreakLogo} />
          <Text style={styles.roundBreakDynamicTitle}>RONDA {state.roundIndex + 1}{`\n`}COMPLETADA</Text>
        </>
      )}
      <View style={styles.roundBreakScores}>
        {state.teams.map((team, index) => (
          <View key={team.name} style={[styles.roundBreakScoreCard, { backgroundColor: index === 0 ? BRAND.yellow : BRAND.mint }]}>
            <Text style={styles.roundBreakScoreName}>{team.name.toUpperCase()}</Text>
            <Text style={styles.roundBreakScoreValue}>{completedScores[index]}</Text>
          </View>
        ))}
      </View>
      <Image source={require('@/assets/rounds/deck-repeats.png')} resizeMode="contain" style={styles.roundBreakRepeatArt} />
      {state.roundIndex === 0 ? (
        <Image source={require('@/assets/rounds/round2-card.png')} resizeMode="contain" style={styles.roundBreakNextArt} />
      ) : (
        <View style={[styles.nextRoundCard, { backgroundColor: ROUND_COLORS[state.roundIndex + 1] }]}>
          <Text style={styles.nextRoundLabel}>{t.roundTable} {state.roundIndex + 2}</Text>
          <Text style={styles.nextRoundTitle}>{[t.decabloRound1, t.decabloRound2, t.decabloRound3][state.roundIndex + 1]}</Text>
        </View>
      )}
      <Pressable
        testID="next-round-button"
        accessibilityRole="button"
        onPress={() => press(startRound)}
        style={({ pressed }) => [styles.roundBreakButton, { backgroundColor: ROUND_COLORS[state.roundIndex + 1] }, pressed && styles.pressed]}
      >
        <Text style={styles.roundBreakButtonText}>{t.nextRound.replace('{n}', String(state.roundIndex + 2)).replace('{round}', nextRound)}</Text>
        <View style={styles.ctaArrow}><Feather name="arrow-right" size={21} color={BRAND.navy} /></View>
      </Pressable>
    </ScrollView>
  );
}

function RoundBreakScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, startRound } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const nextRound = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex + 1] ?? t.rulesTitle1;
  const completedScores = state.roundScores[state.roundIndex];
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <ScreenHeader styles={styles} title={t.roundBreakHeaderTitle} />
      <RoundBadge index={state.roundIndex} label={`${t.roundTable} ${state.roundIndex + 1} · ${t.roundComplete}`} />
      <Text style={styles.pageTitle}>{[t.decabloRound1, t.decabloRound2, t.decabloRound3][state.roundIndex]}</Text>
      <Text style={styles.pageSubtitle}>{t.roundBreakSubtitle}</Text>
      <RoundScoreList styles={styles} roundIndex={state.roundIndex} />
      <Image source={require('@/assets/rounds/deck-repeats.png')} resizeMode="contain" style={styles.referenceArt} />
      <View style={styles.repeatMessage}>
        <Text style={styles.repeatTitle}>{t.decabloSameDeck}</Text>
        <Text style={styles.pageSubtitle}>{t.roundBreakDeckInfo.replace('{count}', String(state.deck.length))}</Text>
      </View>
      <View style={[styles.nextRoundCard, { backgroundColor: ROUND_COLORS[state.roundIndex + 1] }]} >
        <Text style={styles.nextRoundLabel}>{t.roundTable} {state.roundIndex + 2}</Text>
        <Text style={styles.nextRoundTitle}>{[t.decabloRound1, t.decabloRound2, t.decabloRound3][state.roundIndex + 1]}</Text>
      </View>
      <Pressable
        testID="next-round-button"
        accessibilityRole="button"
        onPress={() => press(startRound)}
        style={({ pressed }) => [styles.primaryButton, { backgroundColor: ROUND_COLORS[state.roundIndex + 1] }, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{t.nextRound.replace('{n}', String(state.roundIndex + 2)).replace('{round}', nextRound)}</Text>
        <Feather name="arrow-right" size={21} color={colors.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

function ScoreBoard({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  return (
    <View style={styles.scoreBoard}>
      {[0, 1].map((index) => {
        const team = state.teams[index as 0 | 1];
        return (
          <View key={index} style={[styles.scoreBoardRow, index === 1 && styles.scoreBoardRowLast]}>
            <View style={[styles.teamScoreBadge, index === 0 ? styles.teamScoreBadgeWarm : styles.teamScoreBadgeGold]}>
              <Text style={styles.teamScoreInitial}>{team.icon}</Text>
            </View>
            <Text style={styles.scoreBoardName}>{team.name}</Text>
            <Text style={styles.scoreBoardPoints}>{team.score}</Text>
            <Text style={styles.pointsLabel}>{t.scoreboardPoints}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RoundScoreList({ styles, roundIndex }: { styles: ReturnType<typeof createStyles>; roundIndex?: number }) {
  const { state } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const rows = roundIndex === undefined ? state.roundScores.map((score, index) => ({ score, index })) : [{ score: state.roundScores[roundIndex], index: roundIndex }];
  return (
    <View style={styles.checklist}>
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableLabel, styles.tableHeading]}>{t.roundTable}</Text>
        {state.teams.map((team, index) => <Text key={index} style={[styles.tableNumber, styles.tableHeading]}>{team.name}</Text>)}
      </View>
      {rows.map(({ score, index }) => (
        <View key={index} style={[styles.tableRow, { borderLeftWidth: 5, borderLeftColor: ROUND_COLORS[index] }]}>
          <Text style={styles.tableLabel}>{[t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][index] ?? t.rulesTitle1}</Text>
          <Text style={styles.tableNumber}>{score[0]}</Text>
          <Text style={styles.tableNumber}>{score[1]}</Text>
        </View>
      ))}
      <View style={[styles.tableRow, styles.tableTotal]}>
        <Text style={[styles.tableLabel, styles.tableHeading]}>{t.totalTable}</Text>
        {state.teams.map((team, index) => <Text key={index} style={[styles.tableNumber, styles.tableTotalNumber]}>{team.score}</Text>)}
      </View>
    </View>
  );
}

function FinalScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, startSetup, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const winner = state.teams[0].score === state.teams[1].score ? null : state.teams[0].score > state.teams[1].score ? 0 : 1;
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <ScreenHeader styles={styles} title={t.finalScreenHeaderTitle} onBack={goHome} />
      <View style={styles.finalHero}>
        <View style={styles.referenceArt}><Feather name="award" size={96} color={BRAND.yellow} /></View>
        <Text style={styles.pageEyebrow}>{t.finalTitle}</Text>
        <Text style={styles.finalTitle}>{winner === null ? t.finalTie : t.finalWinner.replace('{team}', state.teams[winner].name)}</Text>
        <Text style={styles.pageSubtitle}>{winner === null ? t.finalTieSubtitle : t.pageFinalSubtitle}</Text>
      </View>
      <ScoreBoard styles={styles} />
      <RoundScoreList styles={styles} />
      <Pressable
        testID="return-home-button"
        accessibilityRole="button"
        onPress={() => press(startSetup)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{t.startNewGame}</Text>
        <Feather name="rotate-ccw" size={20} color={colors.primaryForeground} />
      </Pressable>
      <DecabloLogo compact />
    </ScrollView>
  );
}

export default function Index() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
