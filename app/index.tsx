import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GameProvider, roundNames, TURN_LENGTH_MS, useGame, type CardCount } from '@/context/GameContext';
import { LANGUAGE_OPTIONS, UI_TEXT, type LanguageCode } from '@/data/ui_text';

type Palette = ReturnType<typeof useColors>;

const cardCountOptions: Array<{ value: CardCount; note: string }> = [
  { value: 20, note: 'partida rápida' },
  { value: 30, note: 'partida estándar' },
  { value: 40, note: 'partida larga' },
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

const TEAM_ICONS = ['🌙', '⚡', '🔥', '🌤️', '🌎', '🎯', '🛸', '⚙️', '🐺', '⭐', '🌈', '🎮'];

function AppContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const game = useGame();
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
        return <RoundBreakScreen styles={styles} />;
      case 'final':
        return <FinalScreen styles={styles} />;
      case 'home':
      default:
        return <HomeScreen styles={styles} />;
    }
  })();

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: Platform.OS === 'web' ? 67 : 0 }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HomeScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, hasSavedGame, startSetup, continueGame, setLanguage } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;

  return (
    <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.languageSelectorRow}>
        <Text style={styles.languageSelectorLabel}>{t.language}</Text>
        <View style={styles.languageSelectorPillGroup}>
          {LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.code}
              accessibilityRole="button"
              onPress={() => press(() => setLanguage(option.code))}
              style={({ pressed }) => [
                styles.languageSelectorPill,
                state.language === option.code && styles.languageSelectorPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.languageSelectorText, state.language === option.code && styles.languageSelectorTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>VV</Text>
        </View>
        <View>
          <Text style={styles.wordmark}>VDOUBLE</Text>
          <Text style={styles.eyebrow}>{t.byTeams}</Text>
        </View>
      </View>
      <Text style={styles.heroOverline}>{t.partyGame}</Text>
      <Text style={styles.heroTitle}>
        {t.heroTitleLine1}{'\n'}
        <Text style={styles.heroTitleAccent}>{t.heroTitleLine2}</Text>
      </Text>
      <Text style={styles.heroSubtitle}>{t.heroSubtitle}</Text>

      <View style={styles.cardStack} accessible accessibilityLabel="Ilustración de tarjetas del juego">
        <View style={[styles.stackCard, styles.stackCardBack]} />
        <View style={[styles.stackCard, styles.stackCardMiddle]}>
          <Feather name="clock" size={30} color={colors.primaryForeground} />
          <Text style={styles.stackSmall}>30</Text>
        </View>
        <LinearGradient
          colors={[colors.primary, colors.heroGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.stackCard, styles.stackCardFront]}
        >
          <Text style={styles.stackCategory}>{t.staticStack}</Text>
          <Text style={styles.stackWord}>{t.stackWord}</Text>
          <View style={styles.stackLine} />
          <Text style={styles.stackHint}>{t.stackHint}</Text>
        </LinearGradient>
      </View>

      <View style={styles.statsRow}>
        <Stat value="20/30/40" label={t.statsCards} styles={styles} />
        <Stat value="30 s" label={t.statsTurn} styles={styles} />
        <Stat value="3" label={t.statsRounds} styles={styles} />
      </View>

      <Pressable
        testID="new-game-button"
        accessibilityRole="button"
        onPress={() => (hasSavedGame ? confirmDiscardSavedGame(startSetup, t) : press(startSetup))}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{t.newGame}</Text>
        <Feather name="arrow-up-right" size={21} color={colors.primaryForeground} />
      </Pressable>

      {hasSavedGame ? (
        <Pressable
          testID="continue-game-button"
          accessibilityRole="button"
          onPress={() => press(continueGame)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.secondaryButtonText}>{t.continueGame}</Text>
            <Text style={styles.secondaryButtonNote}>
              {state.teams[0].name} {state.teams[0].score} · {state.teams[1].name} {state.teams[1].score}
            </Text>
          </View>
          <Feather name="play" size={18} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View style={styles.checklist}>
        {[
          [t.rulesRound1, t.rulesTitle1, t.rulesDescription1],
          [t.rulesRound2, t.rulesTitle2, t.rulesDescription2],
          [t.rulesRound3, t.rulesTitle3, t.rulesDescription3],
        ].map(([number, title, description], index) => (
          <View key={number} style={[styles.ruleRow, index === 2 && { borderBottomWidth: 0 }]}>
            <Text style={styles.ruleNumber}>{number}</Text>
            <View style={styles.flex}>
              <Text style={styles.checkWord}>{title}</Text>
              <Text style={styles.ruleDescription}>{description}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.footnote}>{t.footnote}</Text>
    </ScrollView>
  );
}

function Stat({ value, label, styles }: { value: string; label: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.stat}>
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
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => press(onBack)}
          style={styles.iconButton}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}
      <Text style={styles.screenHeaderTitle}>{title}</Text>
      <View style={styles.iconButtonPlaceholder} />
    </View>
  );
}

function SetupScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, updateTeamName, updateTeamIcon, setCardCount, createGame, goHome } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;

  return (
    <ScrollView contentContainerStyle={styles.pageScroll} keyboardShouldPersistTaps="handled">
      <ScreenHeader styles={styles} title={t.setupScreenHeaderTitle} onBack={goHome} />
      <Text style={styles.pageEyebrow}>{t.setupStep}</Text>
      <Text style={styles.pageTitle}>{t.setupPageTitle}</Text>
      <Text style={styles.pageSubtitle}>{t.setupSubtitle}</Text>

      <View style={styles.formBlock}>
        <Text style={styles.fieldLabel}>{t.setupTeams}</Text>
        <TeamInput
          team={0}
          value={state.teams[0].name}
          icon={state.teams[0].icon}
          onChangeText={(value) => updateTeamName(0, value)}
          onIconChange={(icon) => updateTeamIcon(0, icon)}
          styles={styles}
          color={colors.primary}
          language={state.language}
        />
        <TeamInput
          team={1}
          value={state.teams[1].name}
          icon={state.teams[1].icon}
          onChangeText={(value) => updateTeamName(1, value)}
          onIconChange={(icon) => updateTeamIcon(1, icon)}
          styles={styles}
          color={colors.accent}
          language={state.language}
        />
      </View>

      <View style={styles.formBlock}>
        <Text style={styles.fieldLabel}>{t.setupCardCount}</Text>
        <View style={styles.cardCountList}>
          {cardCountOptions.map(({ value, note }) => {
            const selected = state.cardCount === value;
            return (
              <Pressable
                key={value}
                testID={`card-count-${value}`}
                onPress={() => press(() => setCardCount(value))}
                style={[styles.cardCountOption, selected && styles.cardCountOptionSelected]}
              >
                <View style={[styles.cardCountDot, selected && { backgroundColor: colors.primary }]} />
                <View style={styles.flex}>
                  <Text style={[styles.cardCountTitle, selected && styles.cardCountTitleSelected]}>
                    {value} {t.statsCards}
                  </Text>
                  <Text style={styles.cardCountNote}>{note} · {t.cardCountMix}</Text>
                </View>
                {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Feather name="layers" size={18} color={colors.accent} />
        <Text style={styles.infoText}>{t.setupInfo.replace('{count}', String(state.cardCount))}</Text>
      </View>

      <Pressable
        testID="create-game-button"
        accessibilityRole="button"
        onPress={() => press(createGame)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{t.createDeck}</Text>
        <Feather name="arrow-right" size={21} color={colors.primaryForeground} />
      </Pressable>
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
  return (
    <View>
      <View style={styles.teamInputRow}>
        <View style={[styles.teamStripe, { backgroundColor: color }]} />
        <TextInput
          testID={`team-${team}-input`}
          value={value}
          onChangeText={onChangeText}
          placeholder={t.teamCreateIntro.replace('{n}', String(team + 1))}
          placeholderTextColor={styles.placeholder.color}
          maxLength={24}
          style={styles.teamInput}
          returnKeyType="done"
        />
        <Feather name="edit-3" size={16} color={styles.placeholder.color} />
      </View>
      <View style={styles.teamIconPicker}>
        {TEAM_ICONS.map((candidate) => (
          <Pressable
            key={`${team}-${candidate}`}
            accessibilityRole="button"
            accessibilityLabel={t.teamIconPickerLabel.replace('{icon}', candidate).replace('{n}', String(team + 1))}
            onPress={() => press(() => onIconChange(candidate))}
            style={({ pressed }) => [
              styles.teamIconOption,
              candidate === icon && styles.teamIconOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.teamIconOptionText}>{candidate}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function InstructionsScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, startRound } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const roundNumber = state.roundIndex + 1;
  const roundNameText = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex] ?? t.rulesTitle1;
  const copy = [
    t.rulesDescription1,
    t.rulesDescription2,
    t.rulesDescription3,
  ][state.roundIndex] ?? t.rulesDescription1;

  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <ScreenHeader styles={styles} title={t.instructionsHeaderTitle} />
      <View style={styles.roundKicker}>
        <Text style={styles.roundKickerText}>{t.instructionsRound.replace('{n}', String(roundNumber))}</Text>
        <View style={styles.roundKickerLine} />
      </View>
      <Text style={styles.pageTitle}>{roundNameText}</Text>
      <Text style={styles.pageSubtitle}>{copy}</Text>

      <View style={styles.instructionCard}>
        <View style={styles.instructionIcon}>
          <Feather
            name={state.roundIndex === 0 ? 'message-circle' : state.roundIndex === 1 ? 'key' : 'smile'}
            size={25}
            color={colors.accentForeground}
          />
        </View>
        <Text style={styles.instructionTitle}>{t.instructionDuration}</Text>
        <Text style={styles.instructionBody}>{t.instructionsBody}</Text>
      </View>

      <ScoreStrip styles={styles} />

      <Pressable
        testID="start-round-button"
        accessibilityRole="button"
        onPress={() => press(startRound)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{t.startRound}</Text>
        <Feather name="play" size={19} color={colors.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

function ReviewScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, correctReview, confirmReview } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const correct = state.review.filter(item => item.correct).length;
  const nextTeam = state.teams[state.currentTeam === 0 ? 1 : 0].name;
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.pageScroll}>
        <Text style={styles.pageEyebrow}>{t.reviewTurn.replace('{n}', String(state.roundIndex + 1))}</Text>
        <Text style={styles.pageTitle}>{t.reviewTitle}</Text>
        <Text style={styles.pageSubtitle}>{t.reviewSubtitle.replace('{team}', state.teams[state.currentTeam].name)}</Text>
        <View style={styles.reviewSummary}>
          <Text style={styles.reviewSummaryText}>{correct} {t.scoreboardCorrect} · +{correct} {t.scoreboardPoints}</Text>
          <Text style={styles.reviewSummaryNote}>{state.review.length - correct} {t.scoreboardPassed}</Text>
        </View>
        <View style={styles.checklist}>
          {state.review.length === 0 && <Text style={[styles.instructionBody, { padding: 20 }]}>{t.reviewNoCard}</Text>}
          {state.review.map((item, index) => (
            <Pressable key={item.word} accessibilityRole="checkbox"
              accessibilityState={{ checked: item.correct }}
              accessibilityLabel={`${item.word}: ${item.correct ? t.cardStatusCorrect : t.cardStatusPassed}`}
              accessibilityHint={t.reviewEditHint}
              onPress={() => press(() => correctReview(item.word))}
              style={({ pressed }) => [styles.checkRow, item.correct && styles.checkRowCorrect,
                index === state.review.length - 1 && { borderBottomWidth: 0 }, pressed && styles.pressed]}>
              <View style={[styles.checkBox, item.correct && styles.checkBoxCorrect]}>
                {item.correct && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkWord}>{item.word}</Text>
              <Text style={[styles.checkStatus, item.correct && styles.checkStatusCorrect]}>{item.correct ? t.cardStatusCorrect : t.cardStatusPassed}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.footnote}>{t.reviewFootnote.replace('{remaining}', String(state.remaining.length)).replace('{pendingCards}', t.pendingCards)}</Text>
        <ScoreStrip styles={styles} />
      </ScrollView>
      <View style={styles.reviewFooter}>
        <Pressable accessibilityRole="button" onPress={() => press(confirmReview)} style={styles.primaryButton}>
          <Text style={[styles.primaryButtonText, { flex: 1, textAlign: 'center' }]}>{state.remaining.length ? t.reviewConfirm.replace('{team}', nextTeam) : state.roundIndex === 2 ? t.reviewConfirmFinal : t.reviewConfirmRound}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReadyScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { state, continueTurn } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  return (
    <View style={styles.pageScroll}>
      <Text style={styles.pageEyebrow}>{t.readyMobile}</Text>
      <Text style={styles.pageTitle}>{state.teams[state.currentTeam].name}</Text>
      <Text style={styles.pageSubtitle}>{t.readyScreenSubtitle}</Text>
      <ScoreStrip styles={styles} />
      <Pressable accessibilityRole="button" onPress={() => press(continueTurn)} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{t.readyStartTurn}</Text>
      </Pressable>
    </View>
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
  const roundNameText = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex] ?? t.rulesTitle1;

  return (
    <View style={styles.gameScreen}>
      <View style={styles.playHeader}>
        <View>
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
        <LinearGradient
          colors={[colors.card, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wordCard}
        >
          {currentCard ? (
            <>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardCategory}>{currentCard.categoryTranslations?.[state.language] ?? currentCard.categoria}</Text>
                <View style={styles.cardDot} />
                <Text style={styles.cardCategory}>{currentCard.tipo || t.cardCultureType}</Text>
              </View>
              <Text style={styles.wordText}>{currentCard.palabra}</Text>
              <Text style={styles.cardSubcategory}>{(currentCard.subcategoryTranslations?.[state.language] ?? currentCard.subcategoria) || t.cardCultureSubcategory}</Text>
            </>
          ) : (
            <Text style={styles.wordText}>{t.cardCurrent}</Text>
          )}
        </LinearGradient>
        <Text style={styles.remainingText}>{progress} {t.pendingCards} · {t.playWaitText}</Text>
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
          <Feather name="check" size={20} color={colors.primaryForeground} />
          <Text style={styles.correctButtonText}>{t.cardStatusCorrect}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RoundBreakScreen({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const colors = useColors();
  const { state, startRound } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const nextRound = [t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex + 1] ?? t.rulesTitle1;
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <ScreenHeader styles={styles} title={t.roundBreakHeaderTitle} />
      <Text style={styles.pageEyebrow}>{t.roundComplete}</Text>
      <Text style={styles.pageTitle}>{[t.rulesTitle1, t.rulesTitle2, t.rulesTitle3][state.roundIndex] ?? t.rulesTitle1}</Text>
      <Text style={styles.pageSubtitle}>{t.roundBreakSubtitle}</Text>
      <RoundScoreList styles={styles} roundIndex={state.roundIndex} />
      <View style={styles.infoBox}>
        <Feather name="refresh-cw" size={18} color={colors.accent} />
        <Text style={styles.infoText}>{t.roundBreakDeckInfo.replace('{count}', String(state.deck.length))}</Text>
      </View>
      <Pressable
        testID="next-round-button"
        accessibilityRole="button"
        onPress={() => press(startRound)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
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
        <View key={index} style={styles.tableRow}>
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
  const { state, startSetup } = useGame();
  const t = UI_TEXT[state.language] ?? UI_TEXT.es;
  const winner = state.teams[0].score === state.teams[1].score ? null : state.teams[0].score > state.teams[1].score ? 0 : 1;
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <ScreenHeader styles={styles} title={t.finalScreenHeaderTitle} />
      <View style={styles.finalHero}>
        <View style={styles.trophyCircle}>
          <Feather name="award" size={32} color={colors.accentForeground} />
        </View>
        <Text style={styles.pageEyebrow}>{t.finalTitle}</Text>
        <Text style={styles.finalTitle}>{winner === null ? t.finalTie : t.finalWinner.replace('{team}', state.teams[winner].name)}</Text>
        <Text style={styles.pageSubtitle}>{winner === null ? t.finalTieSubtitle : t.pageFinalSubtitle}</Text>
      </View>
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
    </ScrollView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    checklist: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', marginTop: 20, marginBottom: 16 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    checkRowCorrect: { backgroundColor: '#163e35' },
    checkBox: { width: 27, height: 27, borderRadius: 8, borderWidth: 2, borderColor: colors.mutedForeground, alignItems: 'center', justifyContent: 'center' },
    checkBoxCorrect: { backgroundColor: '#6ee7a0', borderColor: '#6ee7a0' },
    checkMark: { fontSize: 20, fontWeight: '900', color: '#102f21' },
    checkWord: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 23, color: colors.foreground },
    checkStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.mutedForeground, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.secondary },
    checkStatusCorrect: { color: '#102f21', backgroundColor: '#6ee7a0' },
    reviewSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginTop: 24 },
    reviewSummaryText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#86efac' },
    reviewSummaryNote: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.mutedForeground },
    reviewFooter: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    languageSelectorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
    languageSelectorLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, color: colors.mutedForeground },
    languageSelectorPillGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    languageSelectorPill: { minWidth: 38, height: 34, paddingHorizontal: 11, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    languageSelectorPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    languageSelectorText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.foreground },
    languageSelectorTextActive: { color: colors.primaryForeground },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeader: { backgroundColor: colors.secondary },
    tableLabel: { flex: 1.4, fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.foreground },
    tableNumber: { flex: 1, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.foreground },
    tableHeading: { fontSize: 12, color: colors.mutedForeground },
    tableTotal: { backgroundColor: colors.secondary, borderBottomWidth: 0 },
    tableTotalNumber: { color: colors.primary, fontSize: 25 },
    ruleRow: { flexDirection: 'row', gap: 16, padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
    ruleNumber: { fontFamily: 'Inter_900Black', fontSize: 21, color: colors.primary },
    ruleDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.mutedForeground, marginTop: 4 },
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    homeScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 26 },
    pageScroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 30 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
    logoMark: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
    logoMarkText: { fontFamily: 'Inter_900Black', fontSize: 22, color: colors.accentForeground, fontWeight: '900', letterSpacing: -1.5, lineHeight: 22 },
    wordmark: { fontFamily: 'Inter_900Black', fontSize: 30, letterSpacing: -0.8, color: colors.foreground, textShadowColor: colors.primary, textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 },
    eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4, color: colors.mutedForeground },
    heroOverline: { marginTop: 32, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, color: colors.primary },
    heroTitle: { marginTop: 9, fontFamily: 'Inter_700Bold', fontSize: 44, lineHeight: 46, letterSpacing: -1.7, color: colors.foreground },
    heroTitleAccent: { color: colors.accent },
    heroSubtitle: { marginTop: 14, maxWidth: 330, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, color: colors.mutedForeground },
    cardStack: { height: 240, marginTop: 24, position: 'relative', alignItems: 'center', justifyContent: 'center' },
    stackCard: { position: 'absolute', width: 218, height: 150, borderRadius: 22, padding: 20 },
    stackCardBack: { backgroundColor: colors.secondary, transform: [{ rotate: '-11deg' }, { translateX: -22 }, { translateY: 9 }], opacity: 0.82 },
    stackCardMiddle: { backgroundColor: colors.accent, transform: [{ rotate: '8deg' }, { translateX: 22 }, { translateY: 5 }], alignItems: 'flex-end', justifyContent: 'space-between', shadowColor: colors.accent, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    stackCardFront: { transform: [{ rotate: '-1deg' }], justifyContent: 'space-between', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
    stackCategory: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, color: colors.primaryForeground, opacity: 0.72 },
    stackWord: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1, color: colors.primaryForeground },
    stackLine: { height: 1, width: 54, backgroundColor: colors.primaryForeground, opacity: 0.5 },
    stackHint: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primaryForeground, opacity: 0.85 },
    stackSmall: { fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.accentForeground },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 5, marginBottom: 22 },
    stat: { flex: 1, alignItems: 'center', minWidth: 76, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    statValue: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.foreground },
    statLabel: { marginTop: 4, fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground },
    primaryButton: { minHeight: 58, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
    primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.primaryForeground },
    secondaryButton: { minHeight: 64, borderRadius: 18, marginTop: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.foreground },
    secondaryButtonNote: { marginTop: 4, fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground },
    footnote: { marginTop: 18, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: colors.mutedForeground },
    pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
    screenHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    screenHeaderTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.foreground },
    iconButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    iconButtonPlaceholder: { width: 38, height: 38 },
    restartButton: { minWidth: 38, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 13, backgroundColor: colors.card },
    restartButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.foreground },
    pageEyebrow: { marginTop: 23, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3, color: colors.primary },
    pageTitle: { marginTop: 10, fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 38, letterSpacing: -1.1, color: colors.foreground },
    pageSubtitle: { marginTop: 11, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, color: colors.mutedForeground },
    formBlock: { marginTop: 29 },
    fieldLabel: { marginBottom: 10, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.1, color: colors.mutedForeground },
    teamInputRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', marginBottom: 7, paddingRight: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    teamStripe: { width: 5, height: 30, borderRadius: 4, marginHorizontal: 15 },
    teamInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground },
    teamIconPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 12, paddingHorizontal: 8, paddingVertical: 7, flexWrap: 'wrap', borderRadius: 16, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
    teamIconOption: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    teamIconOptionActive: { backgroundColor: colors.success, borderColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    teamIconOptionText: { fontSize: 16 },
    placeholder: { color: colors.mutedForeground },
    cardCountList: { gap: 9 },
    cardCountOption: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    cardCountOptionSelected: { borderColor: colors.primary, backgroundColor: colors.secondary, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    cardCountDot: { width: 10, height: 10, borderRadius: 5, marginRight: 13, backgroundColor: colors.border },
    cardCountTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.foreground },
    cardCountTitleSelected: { color: colors.primary },
    cardCountNote: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 22, marginBottom: 22, padding: 17, borderRadius: 19, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
    infoText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.secondaryForeground },
    roundKicker: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28 },
    roundKickerText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2, color: colors.accent },
    roundKickerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    instructionCard: { alignItems: 'center', marginTop: 27, padding: 25, borderRadius: 24, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    instructionIcon: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    instructionTitle: { marginTop: 17, fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.primaryForeground },
    instructionBody: { marginTop: 9, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, color: colors.primaryForeground, opacity: 0.86 },
    scoreStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 24, padding: 17, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    scoreTeam: { flex: 1 },
    scoreTeamRight: { alignItems: 'flex-end' },
    scoreTeamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    scoreTeamNameRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
    scoreTeamIcon: { fontSize: 16 },
    scoreTeamName: { maxWidth: 115, fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.mutedForeground },
    scoreNumber: { marginTop: 3, fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.foreground },
    scoreDivider: { marginHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 18, color: colors.border },
    gameScreen: { flex: 1, paddingHorizontal: 20, paddingBottom: 12 },
    playHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
    playHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    playRound: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, color: colors.mutedForeground },
    activeTeamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
    activeTeamIcon: { fontSize: 22 },
    activeTeam: { fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.foreground },
    timer: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
    timerDanger: { backgroundColor: colors.primary },
    timerNumber: { fontFamily: 'Inter_700Bold', fontSize: 23, lineHeight: 24, color: colors.accentForeground },
    timerLabel: { marginTop: 2, fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.accentForeground, opacity: 0.75 },
    progressTrack: { height: 4, marginTop: 18, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.secondary },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
    playCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    cardOverline: { marginBottom: 12, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, color: colors.mutedForeground },
    wordCard: { width: '100%', minHeight: 270, alignItems: 'center', justifyContent: 'center', padding: 25, borderRadius: 28, borderWidth: 1, borderColor: colors.border, shadowColor: colors.foreground, shadowOpacity: 0.13, shadowRadius: 22, shadowOffset: { width: 0, height: 13 }, elevation: 6 },
    cardTopRow: { position: 'absolute', top: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardCategory: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.primary },
    cardDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
    wordText: { textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 35, lineHeight: 40, letterSpacing: -1, color: colors.foreground },
    cardSubcategory: { position: 'absolute', bottom: 20, fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground },
    remainingText: { marginTop: 14, fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.mutedForeground },
    playActions: { flexDirection: 'row', gap: 10 },
    passButton: { flex: 1, minHeight: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.destructive },
    passButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.destructiveForeground },
    correctButton: { flex: 1.4, minHeight: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success },
    correctButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.successForeground },
    scoreBoard: { marginTop: 28, overflow: 'hidden', borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    scoreBoardRow: { minHeight: 83, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: colors.border },
    scoreBoardRowLast: { borderBottomWidth: 0 },
    teamScoreBadge: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
    teamScoreBadgeWarm: { backgroundColor: colors.primary },
    teamScoreBadgeGold: { backgroundColor: colors.accent },
    teamScoreInitial: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.primaryForeground },
    scoreBoardName: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.foreground },
    scoreBoardPoints: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.foreground },
    pointsLabel: { width: 45, marginLeft: 5, fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.mutedForeground },
     roundScoreCard: { marginTop: 16, padding: 17, borderRadius: 20, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
     roundScoreTitle: { marginBottom: 9, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, color: colors.mutedForeground },
     roundScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
     roundScoreHighlight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
     roundScoreName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.foreground },
     roundScoreNameRight: { textAlign: 'right' },
     roundScoreValue: { minWidth: 65, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.primary },
    finalHero: { alignItems: 'center', paddingTop: 33 },
    trophyCircle: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    finalTitle: { marginTop: 13, fontFamily: 'Inter_700Bold', fontSize: 36, lineHeight: 40, letterSpacing: -1.2, textAlign: 'center', color: colors.foreground },
  });
}

export default function Index() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
