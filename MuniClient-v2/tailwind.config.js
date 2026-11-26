/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Los colores de la institución: los fija src/lib/marca.ts desde Configuración (valores por defecto en index.css).
        ocean: {
          50: 'rgb(var(--ocean-50) / <alpha-value>)',
          100: 'rgb(var(--ocean-100) / <alpha-value>)',
          200: 'rgb(var(--ocean-200) / <alpha-value>)',
          300: 'rgb(var(--ocean-300) / <alpha-value>)',
          400: 'rgb(var(--ocean-400) / <alpha-value>)',
          500: 'rgb(var(--ocean-500) / <alpha-value>)',
          600: 'rgb(var(--ocean-600) / <alpha-value>)',
          700: 'rgb(var(--ocean-700) / <alpha-value>)',
          800: 'rgb(var(--ocean-800) / <alpha-value>)',
          900: 'rgb(var(--ocean-900) / <alpha-value>)',
        },
        sunset: {
          50: 'rgb(var(--sunset-50) / <alpha-value>)',
          100: 'rgb(var(--sunset-100) / <alpha-value>)',
          200: 'rgb(var(--sunset-200) / <alpha-value>)',
          300: 'rgb(var(--sunset-300) / <alpha-value>)',
          400: 'rgb(var(--sunset-400) / <alpha-value>)',
          500: 'rgb(var(--sunset-500) / <alpha-value>)',
          600: 'rgb(var(--sunset-600) / <alpha-value>)',
          700: 'rgb(var(--sunset-700) / <alpha-value>)',
          800: 'rgb(var(--sunset-800) / <alpha-value>)',
          900: 'rgb(var(--sunset-900) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':  { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
