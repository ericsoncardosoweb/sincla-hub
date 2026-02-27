import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    Group,
    Title,
    Text,
    Button,
    ActionIcon,
    Tooltip,
    Modal,
    Stack,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    /** Page title — rendered in brand navy blue */
    title: string;
    /** Subtitle / description */
    subtitle?: string;
    /** Primary action button label */
    actionLabel?: string;
    /** Primary action button icon */
    actionIcon?: ReactNode;
    /** Primary action callback */
    onAction?: () => void;
    /** Help content rendered in a modal */
    helpContent?: ReactNode;
    /** Help modal title */
    helpTitle?: string;
    /** Extra content to render on the right side */
    rightSection?: ReactNode;
}

export function PageHeader({
    title,
    subtitle,
    actionLabel,
    actionIcon,
    onAction,
    helpContent,
    helpTitle,
    rightSection,
}: PageHeaderProps) {
    const [helpOpen, setHelpOpen] = useState(false);

    return (
        <>
            <Group justify="space-between" mb="lg" className={styles.header} wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                    <Title order={2} className={styles.title}>{title}</Title>
                    {subtitle && (
                        <Text size="sm" c="dimmed" mt={2}>{subtitle}</Text>
                    )}
                </div>

                <Group gap="sm" wrap="nowrap">
                    {rightSection}

                    {actionLabel && onAction && (
                        <Button
                            leftSection={actionIcon}
                            onClick={onAction}
                            className={styles.actionButton}
                        >
                            {actionLabel}
                        </Button>
                    )}

                    {helpContent && (
                        <Tooltip label="Como funciona?" withArrow>
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                                radius="xl"
                                onClick={() => setHelpOpen(true)}
                                className={styles.helpButton}
                            >
                                <IconInfoCircle size={20} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Group>

            {/* Help Modal */}
            {helpContent && (
                <Modal
                    opened={helpOpen}
                    onClose={() => setHelpOpen(false)}
                    title={helpTitle || `Sobre: ${title}`}
                    size="md"
                    radius="md"
                >
                    <Stack gap="md">
                        {typeof helpContent === 'string' ? (
                            <Text size="sm">{helpContent}</Text>
                        ) : (
                            helpContent
                        )}
                    </Stack>
                </Modal>
            )}
        </>
    );
}
