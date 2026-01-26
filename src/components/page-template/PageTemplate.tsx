import { Link } from 'react-router-dom';
import { Container, Title, Text, Box, Breadcrumbs, Anchor } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { SignatureVisual } from '../signature-visual';
import classes from './PageTemplate.module.css';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface PageTemplateProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

export function PageTemplate({ title, subtitle, breadcrumbs, children }: PageTemplateProps) {
    return (
        <div className={classes.wrapper}>
            <SignatureVisual />

            {/* Back Button */}
            <Link to="/" className={classes.backLink}>
                <IconArrowLeft size={16} />
                Voltar para o início
            </Link>

            <Container size="lg" className={classes.container}>
                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <Breadcrumbs className={classes.breadcrumbs} separator="→">
                        {breadcrumbs.map((item, index) => (
                            item.href ? (
                                <Anchor component={Link} to={item.href} key={index} className={classes.breadcrumbLink}>
                                    {item.label}
                                </Anchor>
                            ) : (
                                <Text key={index} className={classes.breadcrumbCurrent}>
                                    {item.label}
                                </Text>
                            )
                        ))}
                    </Breadcrumbs>
                )}

                {/* Header */}
                <Box className={classes.header}>
                    <Title order={1} className={classes.title}>
                        {title}
                    </Title>
                    {subtitle && (
                        <Text className={classes.subtitle}>
                            {subtitle}
                        </Text>
                    )}
                </Box>

                {/* Content */}
                <Box className={classes.content}>
                    {children || (
                        <Box className={classes.placeholder}>
                            <Text c="dimmed" ta="center">
                                Esta página está em construção.
                            </Text>
                            <Text c="dimmed" size="sm" ta="center" mt="xs">
                                Em breve você terá acesso a todo o conteúdo.
                            </Text>
                        </Box>
                    )}
                </Box>
            </Container>
        </div>
    );
}
