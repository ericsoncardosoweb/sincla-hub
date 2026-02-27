import { createTheme } from '@mantine/core';

// Sincla Brand Colors (10 shades required by Mantine)
const sinclaBlue = [
    '#e6f3ff',
    '#cce7ff',
    '#99cfff',
    '#66b7ff',
    '#339fff',
    '#0087ff',
    '#006fcc',
    '#005799',
    '#003f66',
    '#002733',
] as const;

const sinclaOrange = [
    '#fff4e6',
    '#ffe8cc',
    '#ffd199',
    '#ffba66',
    '#ffa333',
    '#ff8c00',
    '#cc7000',
    '#995400',
    '#663800',
    '#331c00',
] as const;

export const theme = createTheme({
    primaryColor: 'sinclaBlue',
    colors: {
        sinclaBlue,
        sinclaOrange,
    },
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headings: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                shadow: 'sm',
            },
        },
    },
});
