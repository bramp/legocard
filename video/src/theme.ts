export interface ThemePalette {
  primary: string;
  secondary: string;
  glow: string;
  badgeBorder: string;
  badgeBg: string;
  accentText: string;
  baseplateBg: string;
  baseplateStud: string;
  isSpaceTheme: boolean;
}

export function getThemePalette(themeName?: string, setName?: string): ThemePalette {
  const t = (themeName || '').toLowerCase();
  const n = (setName || '').toLowerCase();

  // Special case: Ocean / Waterfront models (Sydney Opera House, Titanic, Harbor, etc.)
  const isWaterfront =
    n.includes('opera') ||
    n.includes('titanic') ||
    n.includes('ship') ||
    n.includes('boat') ||
    n.includes('lighthouse') ||
    n.includes('harbor') ||
    n.includes('coast');

  if (t.includes('star wars') || t.includes('space') || t.includes('galaxy')) {
    return {
      primary: '#38bdf8', // Saber cyan / hyperdrive blue
      secondary: '#2563eb',
      glow: 'rgba(56, 189, 248, 0.65)',
      badgeBorder: 'rgba(56, 189, 248, 0.75)',
      badgeBg: 'rgba(56, 189, 248, 0.22)',
      accentText: '#7dd3fc',
      baseplateBg: '#0c0f16', // Imperial Dark Slate
      baseplateStud: '#161c28',
      isSpaceTheme: true,
    };
  }

  if (
    t.includes('lord of the rings') ||
    t.includes('rings') ||
    t.includes('lotr') ||
    t.includes('middle-earth')
  ) {
    return {
      primary: '#f97316', // Fiery ring orange
      secondary: '#ea580c',
      glow: 'rgba(249, 115, 22, 0.65)',
      badgeBorder: 'rgba(249, 115, 22, 0.75)',
      badgeBg: 'rgba(249, 115, 22, 0.22)',
      accentText: '#fdba74',
      baseplateBg: '#16120e', // Mordor Dark Earth
      baseplateStud: '#241d17',
      isSpaceTheme: false,
    };
  }

  if (
    t.includes('botanical') ||
    t.includes('ideas') ||
    t.includes('flower') ||
    t.includes('plant')
  ) {
    return {
      primary: '#10b981', // Botanical emerald
      secondary: '#059669',
      glow: 'rgba(16, 185, 129, 0.65)',
      badgeBorder: 'rgba(16, 185, 129, 0.75)',
      badgeBg: 'rgba(16, 185, 129, 0.22)',
      accentText: '#6ee7b7',
      baseplateBg: '#0e1d13', // Classic LEGO Green Baseplate
      baseplateStud: '#162d1e',
      isSpaceTheme: false,
    };
  }

  if (
    t.includes('technic') ||
    t.includes('speed') ||
    t.includes('racing') ||
    t.includes('car')
  ) {
    return {
      primary: '#ff5400', // Racing orange
      secondary: '#e11d48',
      glow: 'rgba(255, 84, 0, 0.65)',
      badgeBorder: 'rgba(255, 84, 0, 0.75)',
      badgeBg: 'rgba(255, 84, 0, 0.22)',
      accentText: '#ff8533',
      baseplateBg: '#121214', // Asphalt Black Baseplate
      baseplateStud: '#1e1f24',
      isSpaceTheme: false,
    };
  }

  if (
    t.includes('marvel') ||
    t.includes('super heroes') ||
    t.includes('dc') ||
    t.includes('batman') ||
    t.includes('avengers')
  ) {
    return {
      primary: '#ef4444', // Comic hero crimson
      secondary: '#f59e0b',
      glow: 'rgba(239, 68, 68, 0.65)',
      badgeBorder: 'rgba(239, 68, 68, 0.75)',
      badgeBg: 'rgba(239, 68, 68, 0.22)',
      accentText: '#fca5a5',
      baseplateBg: '#151014', // Comic Noir Baseplate
      baseplateStud: '#221921',
      isSpaceTheme: false,
    };
  }

  if (t.includes('harry potter') || t.includes('wizard')) {
    return {
      primary: '#a855f7', // Wizard violet
      secondary: '#f59e0b',
      glow: 'rgba(168, 85, 247, 0.65)',
      badgeBorder: 'rgba(168, 85, 247, 0.75)',
      badgeBg: 'rgba(168, 85, 247, 0.22)',
      accentText: '#d8b4fe',
      baseplateBg: '#12101b', // Hogwarts Stone Baseplate
      baseplateStud: '#1e1a2c',
      isSpaceTheme: false,
    };
  }

  // Ocean / Waterfront sets in Icons / Creator get the iconic Blue Baseplate!
  if (isWaterfront) {
    return {
      primary: '#38bdf8',
      secondary: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.65)',
      badgeBorder: 'rgba(56, 189, 248, 0.75)',
      badgeBg: 'rgba(56, 189, 248, 0.22)',
      accentText: '#7dd3fc',
      baseplateBg: '#0c1a29', // Classic Blue Baseplate (as featured with Sydney Opera House)
      baseplateStud: '#14273c',
      isSpaceTheme: false,
    };
  }

  // Default: Premium Lego Gold (Icons, Architecture, Creator Expert, etc.)
  return {
    primary: '#f59e0b',
    secondary: '#d97706',
    glow: 'rgba(245, 158, 11, 0.65)',
    badgeBorder: 'rgba(245, 158, 11, 0.75)',
    badgeBg: 'rgba(245, 158, 11, 0.22)',
    accentText: '#fbbf24',
    baseplateBg: '#141720', // Classic Dark Bluish Gray Baseplate
    baseplateStud: '#1f2432',
    isSpaceTheme: false,
  };
}
