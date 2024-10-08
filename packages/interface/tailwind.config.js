const colors = require('tailwindcss/colors');

const primaryColor = colors.blue[500]; // We chose blue-500 as the independent variable primary color just because we like it. All other colors are calculated from primaryColor.
// These colors were generated by GPT in a tetrad with the primary color by
// rotating the hue on an interval `golden ratio` degrees, ie. an interval
// of 61.803 degrees:
const secondaryColor = '#b43af6'; // this color is closest to purple-500. Calculated using the python program at bottom of this file.
const tertiaryColor = '#f63a76'; // this color is closest to rose-500
const quaternaryColor = '#f6bf3a'; // this color is closest to amber-400

// For darker variants, we use the next shade up in tailwind's colors:
const primaryColorDarker = colors.blue[600];
const secondaryColorDarker = colors.purple[600];
const tertiaryColorDarker = colors.rose[600];
const quaternaryColorDarker = colors.amber[500];

// For darker-2 variants, we use the next shade up in tailwind's colors:
const primaryColorDarker2 = colors.blue[700];
const secondaryColorDarker2 = colors.purple[700];
const tertiaryColorDarker2 = colors.rose[700];
const quaternaryColorDarker2 = colors.amber[600];

// For lighter variants, we use the next shade down in tailwind's colors:
const primaryColorLighter = colors.blue[400];
const secondaryColorLighter = colors.purple[400];
const tertiaryColorLighter = colors.rose[400];
const quaternaryColorLighter = colors.amber[300];

// For lighter-2 variants, we use the next shade down in tailwind's colors:
const primaryColorLighter2 = colors.blue[300];
const secondaryColorLighter2 = colors.purple[300];
const tertiaryColorLighter2 = colors.rose[300];
const quaternaryColorLighter2 = colors.amber[200];

const ourColors = {
  'primary': primaryColor,
  'secondary': secondaryColor,
  'tertiary': tertiaryColor,
  'quaternary': quaternaryColor,
  'primary-darker': primaryColorDarker,
  'secondary-darker': secondaryColorDarker,
  'tertiary-darker': tertiaryColorDarker,
  'quaternary-darker': quaternaryColorDarker,
  'primary-darker-2': primaryColorDarker2,
  'secondary-darker-2': secondaryColorDarker2,
  'tertiary-darker-2': tertiaryColorDarker2,
  'quaternary-darker-2': quaternaryColorDarker2,
  'primary-lighter': primaryColorLighter,
  'secondary-lighter': secondaryColorLighter,
  'tertiary-lighter': tertiaryColorLighter,
  'quaternary-lighter': quaternaryColorLighter,
  'primary-lighter-2': primaryColorLighter2,
  'secondary-lighter-2': secondaryColorLighter2,
  'tertiary-lighter-2': tertiaryColorLighter2,
  'quaternary-lighter-2': quaternaryColorLighter2,
};

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,css}", // this list of extensions must be the complete set of extensions in our project that use any tailwind classes. This list ensures that tailwind classes used in these files are preserved during the purging process, while any unused classes are removed from the production build. This optimization helps reduce the size of the final CSS file, resulting in improved performance.
  ],
  theme: {
    screens: {
      'sm': '435px', // by default, tailwind's small breakpoint starts at 640px, but we set it to 435px as the solution to the following problem: 3cities may be displayed as an iframe modal pop-up inside another site, in which case we want the pop-up to be as narrow as possible because the 3cities payment content is fairly narrow and the overall UX tends to look and feel better if the pop-up is occluding less of the underlying site. However, if the pop-up always narrower than tailwind's small breakpoint, then a pop-up on desktop will render 3cities in mobile mode, which disables various features designed to improve UX on desktop, especially `sm:hover:` states that eg. make buttons change color when moused over. These hover states need to be disabled on mobile because they are incompatible with tap gestures. Eg. if you tap a button in mobile view, any hover state persists even after the tap is complete, resulting in the button changing color until somewhere else on the screen is tapped. In fact, we don't even want the button to change color when tapped because, in this case, the color change is supposed to be on hover, not on tap. Our solution to this problem is to run the iframe pop-up in desktop mode, while still ensuring that phones display 3cities in mobile mode. The widest phone on the market right now may be the iPhone 14 Pro Max at 430 CSS pixels wide (note difference between device's native pixel resolution vs css pixels per device pixel ratio (DPR)). So, we set our sm breakpoint to 435px such that tailwind classes like `sm:hover:bg-primary-darker` can properly trigger for a desktop modal pop-up while also being properly unused for mobile resolutions. Of course, the 3cities modal pop-up code must ensure that the iframe's width is at least 435px on desktop.
    },
    extend: {
      animation: {
        'spin-fast': 'spin 0.618s linear infinite',
      },
      backgroundColor: ourColors,
      textColor: ourColors,
      borderColor: ourColors,
      fill: ourColors,
      stroke: ourColors,
      placeholderColor: ourColors,
      ringColor: ourColors,
      gradientColorStops: ourColors,
    },
  },
  plugins: [],
}

// Here's a python program written by GPT to calculate the closest tailwind color class to a given hex color. Note that GPT was unable to write out the full tailwind color dictionary; I had to fill it in manually, but it wrote the algorithms.
// usage: update input_color as desired -> copy below -> `pbpaste | python3`
/*
import colorsys

def hex_to_rgb(hex_color: str) -> tuple:
    """Converts a HEX color to RGB tuple."""
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))

def color_distance(color1: str, color2: str) -> float:
    """Calculates the Euclidean distance between two colors in RGB space."""
    rgb1 = hex_to_rgb(color1)
    rgb2 = hex_to_rgb(color2)
    return sum((c1 - c2) ** 2 for c1, c2 in zip(rgb1, rgb2))

def find_closest_color(input_color: str, color_dict: dict) -> str:
    """Finds the closest color in the dictionary to the input color."""
    closest_color = None
    min_distance = float('inf')
    for color_name, color_hex in color_dict.items():
        distance = color_distance(input_color, color_hex)
        if distance < min_distance:
            min_distance = distance
            closest_color = color_name
    return closest_color

# Dictionary of colors from tailwindcss v3.2
# To update:
#   1. copy from https://github.com/tailwindlabs/tailwindcss/blob/master/src/public/colors.js
#   2. add single quotes around color name keys (the js file has `slate:` but python needs `'slate':`)
color_dict_unflattened = {
  'slate': {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  'gray': {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  'zinc': {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  'neutral': {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  'stone': {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
  'red': {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  'orange': {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  'amber': {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  'yellow': {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
    950: '#422006',
  },
  'lime': {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
    950: '#1a2e05',
  },
  'green': {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  'emerald': {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  'teal': {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  'cyan': {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
  },
  'sky': {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  'blue': {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  'indigo': {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  'violet': {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },
  'purple': {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  'fuchsia': {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  'pink': {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
    950: '#500724',
  },
  'rose': {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519',
  },
}

color_dict = {}
for color_family, shades in color_dict_unflattened.items():
    for shade, hex_color in shades.items():
        color_dict[f"{color_family}-{shade}"] = hex_color

# Input color in HEX format
input_color = '#e11d48'

# Find the closest color to the input color
closest_color = find_closest_color(input_color, color_dict)
print(f"The closest color to {input_color} is {closest_color}.")
*/
