/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#0a0a0a',
    tint: '#f6c84a',

    // Core surfaces
    background: '#352342',
    foreground: '#f7f6ff',

    // Cards / elevated surfaces
    card: '#513466',
    cardForeground: '#f7f6ff',

    // Primary action color (buttons, links, active states)
    primary: '#f6c84a',
    primaryForeground: '#161d40',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#634477',
    secondaryForeground: '#f7f6ff',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#463055',
    mutedForeground: '#ded0ed',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#c5a3ed',
    accentForeground: '#352342',
    heroGradient: '#ffe08a',

    // Destructive actions (delete, error states)
    destructive: '#f87171',
    destructiveForeground: '#fff7f7',

    // Positive action color (correct answers and success states)
    success: '#4ade80',
    successForeground: '#10251a',

    // Borders and input outlines
    border: '#88659c',
    input: '#88659c',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
