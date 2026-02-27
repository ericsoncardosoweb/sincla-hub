import type { ReactNode } from 'react';
import { Stack, Text, Button, ThemeIcon } from '@mantine/core';
import styles from './PageHeader.module.css';

interface EmptyStateProps {
    /** Icon to display */
    icon: ReactNode;
    /** Title of the empty state */
    title: string;
    /** Description / explanation */
    description?: string;
    /** CTA button label */
    actionLabel?: string;
    /** CTA button icon */
    actionIcon?: ReactNode;
    /** CTA callback */
    onAction?: () => void;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    actionIcon,
    onAction,
}: EmptyStateProps) {
    return (
        <Stack align="center" justify="center" gap="md" py={48} className={styles.emptyState}>
            <ThemeIcon
                size={64}
                radius="xl"
                variant="light"
                color="gray"
                className={styles.emptyIcon}
            >
                {icon}
            </ThemeIcon>

            <div style={{ textAlign: 'center', maxWidth: 360 }}>
                <Text fw={600} size="md" c="#00045c" mb={4}>
                    {title}
                </Text>
                {description && (
                    <Text size="sm" c="dimmed">
                        {description}
                    </Text>
                )}
            </div>

            {actionLabel && onAction && (
                <Button
                    variant="light"
                    leftSection={actionIcon}
                    onClick={onAction}
                    mt="xs"
                >
                    {actionLabel}
                </Button>
            )}
        </Stack>
    );
}
