import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layout/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  // Important: Tailwind is used alongside MUI, so we use 'important' to handle specificity
  important: '#__next',
  corePlugins: {
    // Disable preflight to avoid conflicts with MUI's CssBaseline
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        // Chartwarden brand colors
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3d8f',
          900: '#072e6f'
        },
        secondary: {
          50: '#fce4ec',
          100: '#f8bbd9',
          200: '#f48fb1',
          300: '#f06292',
          400: '#ec407a',
          500: '#e91e63',
          600: '#d81b60',
          700: '#c2185b',
          800: '#ad1457',
          900: '#880e4f'
        },
        success: {
          main: '#4caf50',
          light: '#80e27e',
          dark: '#087f23'
        },
        warning: {
          main: '#ff9800',
          light: '#ffc947',
          dark: '#c66900'
        },
        error: {
          main: '#f44336',
          light: '#ff7961',
          dark: '#ba000d'
        }
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif']
      },
      spacing: {
        'drawer': '280px',
        'drawer-mini': '90px',
        'header': '74px'
      },
      zIndex: {
        'drawer': '1200',
        'modal': '1300',
        'snackbar': '1400',
        'tooltip': '1500'
      }
    }
  },
  plugins: []
};

export default config;
