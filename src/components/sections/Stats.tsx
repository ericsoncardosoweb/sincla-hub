import { useEffect, useState, useRef } from 'react';
import { Container, Title, Text, Box, Group } from '@mantine/core';
import classes from './Stats.module.css';

// Hook para animar números
function useCountUp(end: number, duration: number = 2000, startCounting: boolean = false) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!startCounting) return;

        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (startTime === null) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function para desacelerar no final
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, startCounting]);

    return count;
}

// Componente de número animado
function AnimatedStat({
    value,
    suffix,
    label,
    color,
    startCounting,
}: {
    value: number;
    suffix: string;
    label: string;
    color: string;
    startCounting: boolean;
}) {
    const count = useCountUp(value, 2500, startCounting);

    return (
        <Box className={classes.statItem}>
            <Text
                className={classes.statNumber}
                style={{ '--stat-color': color } as React.CSSProperties}
            >
                {count.toLocaleString('pt-BR')}
                {suffix}
            </Text>
            <Text className={classes.statLabel}>{label}</Text>
        </Box>
    );
}

export function Stats() {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className={classes.stats}>
            <Container size="xl">
                <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="wrap"
                    gap={40}
                    className={classes.content}
                >
                    {/* Left Side - Main Stats */}
                    <Box className={classes.mainStats}>
                        <Title order={2} className={classes.mainTitle}>
                            Empresas de todo o Brasil
                            <br />
                            confiam na Sincla
                        </Title>
                        <Box className={classes.bigStat}>
                            <Text
                                className={classes.bigNumber}
                                style={{ '--stat-color': '#0087ff' } as React.CSSProperties}
                            >
                                {isVisible ? (
                                    <AnimatedBigNumber value={5000} startCounting={isVisible} />
                                ) : (
                                    '0'
                                )}
                                +
                            </Text>
                            <Text className={classes.bigLabel}>
                                empresas impulsionam a gestão com a Sincla
                            </Text>
                        </Box>
                    </Box>

                    {/* Middle - Additional Stats */}
                    <Box className={classes.additionalStats}>
                        <Box className={classes.additionalStatItem}>
                            <AnimatedStat
                                value={27}
                                suffix=""
                                label="estados brasileiros com clientes ativos na plataforma"
                                color="#0087ff"
                                startCounting={isVisible}
                            />
                        </Box>
                        <Box className={classes.statDivider} />
                        <Box className={classes.additionalStatItem}>
                            <AnimatedStat
                                value={95}
                                suffix="%"
                                label="de satisfação entre os usuários da plataforma"
                                color="#0087ff"
                                startCounting={isVisible}
                            />
                        </Box>
                    </Box>

                    {/* Right Side - Planet Glassmorphism Visual */}
                    <Box className={classes.visualSide}>
                        <Box className={classes.planetContainer}>
                            {/* Outer glow */}
                            <Box className={classes.outerGlow} />

                            {/* Main planet - Earth */}
                            <Box className={classes.planet}>
                                <Box className={classes.planetCore} />
                                <Box className={classes.atmosphere} />
                                <Box className={classes.planetGlass} />
                                <Box className={classes.planetReflection} />
                                <Box className={classes.planetRim} />
                            </Box>

                            {/* Moon */}
                            <Box className={classes.moon}>
                                <Box className={classes.moonGlow} />
                            </Box>

                            {/* Floating particles */}
                            <Box className={classes.particles}>
                                <span className={classes.particle} />
                                <span className={classes.particle} />
                                <span className={classes.particle} />
                                <span className={classes.particle} />
                                <span className={classes.particle} />
                                <span className={classes.particle} />
                            </Box>

                            {/* Light flare */}
                            <Box className={classes.lightFlare} />
                        </Box>
                    </Box>
                </Group>
            </Container>
        </section>
    );
}

// Componente separado para o número grande animado
function AnimatedBigNumber({
    value,
    startCounting,
}: {
    value: number;
    startCounting: boolean;
}) {
    const count = useCountUp(value, 2500, startCounting);
    return <>{count.toLocaleString('pt-BR')}</>;
}
