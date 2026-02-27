import { createTheme, MantineColorsTuple } from '@mantine/core';

// ─── Sincla Brand Colors ─────────────────────────────────────────────────────

const sinclaPrimary: MantineColorsTuple = [
    '#e6f3ff',
    '#cce4ff',
    '#99c9ff',
    '#66adff',
    '#3392ff',
    '#0087ff', // sincla blue (primary)
    '#006fcc',
    '#005799',
    '#003f66',
    '#002733',
];

const sinclaSecondary: MantineColorsTuple = [
    '#fff3e0',
    '#ffe5c0',
    '#ffcc80',
    '#ffb340',
    '#ff9900',
    '#ff8c00', // sincla orange (secondary)
    '#cc7000',
    '#995400',
    '#663800',
    '#331c00',
];

// ─── Theme ───────────────────────────────────────────────────────────────────

export const theme = createTheme({
    primaryColor: 'sinclaPrimary',
    colors: {
        sinclaPrimary,
        sinclaSecondary,
    },
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headings: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: '700',
    },
    defaultRadius: 'md',
    cursorType: 'pointer',
    components: {
        Button: {
            defaultProps: {
                radius: 'md',
            },
        },
        Card: {
            defaultProps: {
                radius: 'lg',
                padding: 'lg',
            },
        },
        TextInput: {
            defaultProps: {
                radius: 'md',
            },
        },
        Select: {
            defaultProps: {
                radius: 'md',
            },
        },
    },
});
