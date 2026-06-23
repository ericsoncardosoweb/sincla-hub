import { useRef, useEffect, useState } from 'react';
import { Container, Title, Text, Button, Group, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import classes from './ProductShowcase.module.css';

interface ProductShowcaseProps {
    signupUrl: string;
}

// Dados dos produtos para showcase com logos SVG
const showcaseProducts = [
    {
        id: 'rh',
        logo: '/logos/sincla-rh.svg',
        name: 'Sincla RH',
        headline: 'Gestão de pessoas simplificada,',
        subheadline: 'projetada com cliques mínimos',
        description: 'Chega de parametrizações pesadas e sistemas engessados. Criado por um especialista que viveu o dia a dia do RH, o Sincla RH reúne colaboradores, avaliações, PDIs, metas e feedbacks em uma rotina que funciona em poucos cliques.',
        ctaText: 'Começar agora',
        exploreText: 'Conheça o Sincla RH',
        color: '#0066CC',
        bgColor: 'rgba(0, 102, 204, 0.08)',
        testimonial: {
            logo: '🏢',
            company: 'TechCorp',
            text: 'O Sincla RH eliminou a burocracia. Conseguimos rodar avaliações e PDIs completos com pouquíssimos cliques de forma fluida.',
            link: 'Veja a história.',
        },
    },
    {
        id: 'recrutamento',
        logo: '/logos/sincla-recrutamento.svg',
        name: 'Sincla Recrutamento',
        headline: 'Tudo é customizável.',
        subheadline: 'Nada é engessado.',
        description: 'Uma plataforma de R&S turbinada com inteligência artificial para agilizar a triagem técnica e comportamental (Profiler DISC) e automatizar o envio de feedbacks. O fluxo de contratação molda-se ao seu processo.',
        ctaText: 'Testar gratuitamente',
        exploreText: 'Conheça o Recrutamento',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        testimonial: {
            logo: '🎯',
            company: 'VagaCerta',
            text: 'A IA nos deu precisão e agilidade incrível na triagem, e o melhor é que pudemos customizar 100% das etapas do nosso funil.',
            link: 'Leia a história.',
        },
    },
    {
        id: 'ead',
        logo: '/logos/sincla-ead.svg',
        name: 'Sincla EAD',
        headline: 'Capacite toda a sua equipe,',
        subheadline: 'de forma automática e escalável',
        description: 'Livre-se de treinamentos repetitivos de onboarding. Crie trilhas de aprendizagem automatizadas e emita certificados integrados diretamente ao histórico de RH do colaborador.',
        ctaText: 'Começar agora',
        exploreText: 'Conheça o Sincla EAD',
        color: '#FF6600',
        bgColor: 'rgba(255, 102, 0, 0.08)',
        testimonial: {
            logo: '🎓',
            company: 'Educorp',
            text: 'Integramos centenas de colaboradores com trilhas automáticas no Sincla EAD integradas ao RH, poupando semanas de integrações manuais.',
            link: 'Veja o case.',
        },
    },
];

function ProductSection({ product, index, signupUrl }: { product: typeof showcaseProducts[0]; index: number; signupUrl: string }) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const isEven = index % 2 === 0;

    return (
        <section
            ref={sectionRef}
            id={product.id}
            className={`${classes.productSection} ${isVisible ? classes.visible : ''}`}
            style={{ '--product-color': product.color, '--product-bg': product.bgColor } as React.CSSProperties}
        >
            <Container size="xl">
                <Group
                    align="center"
                    justify="space-between"
                    wrap="wrap"
                    gap={60}
                    className={isEven ? '' : classes.reversed}
                >
                    {/* Content Side */}
                    <Box className={classes.contentSide}>
                        {/* Product Badge */}
                        <Group gap="sm" mb="md">
                            <Box
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: product.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <img
                                    src={product.logo}
                                    alt={product.name}
                                    style={{
                                        width: 20,
                                        height: 20,
                                        objectFit: 'contain',
                                        filter: 'brightness(0) invert(1)',
                                    }}
                                />
                            </Box>
                            <Text fw={600} size="lg" c="white">
                                {product.name}
                            </Text>
                        </Group>

                        {/* Headlines */}
                        <Title order={2} className={classes.productTitle}>
                            {product.headline}
                            <br />
                            <span className={classes.productSubtitle}>{product.subheadline}</span>
                        </Title>

                        {/* Description */}
                        <Text className={classes.productDescription}>
                            {product.description}
                        </Text>

                        {/* CTAs */}
                        <Group gap="md" mt={32}>
                            <Button
                                component="a"
                                href={signupUrl}
                                size="md"
                                radius="xl"
                                style={{ background: product.color }}
                                className={classes.ctaPrimary}
                            >
                                {product.ctaText}
                            </Button>
                            <Button
                                component={Link}
                                to={`/${product.id}`}
                                size="md"
                                variant="subtle"
                                color="gray"
                                rightSection={<IconArrowRight size={16} />}
                                className={classes.ctaSecondary}
                                style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                            >
                                {product.exploreText}
                            </Button>
                        </Group>

                        {/* Testimonial Card */}
                        <Box className={classes.testimonialCard}>
                            <Group gap="md" align="flex-start">
                                <Box className={classes.testimonialLogo}>
                                    {product.testimonial.logo}
                                </Box>
                                <Box flex={1}>
                                    <Text size="sm" className={classes.testimonialText} c="rgba(255, 255, 255, 0.7)">
                                        <strong style={{ color: '#ffffff' }}>{product.testimonial.company}</strong> {product.testimonial.text}{' '}
                                        <a href="#" className={classes.testimonialLink} style={{ color: product.color }}>
                                            {product.testimonial.link}
                                        </a>
                                    </Text>
                                </Box>
                            </Group>
                        </Box>
                    </Box>

                    {/* Visual Side - Mockup */}
                    <Box className={classes.visualSide}>
                        <Box
                            className={classes.mockupWrapper}
                            style={{ '--glow-color': product.color } as React.CSSProperties}
                        >
                            {/* Animated decoration */}
                            <svg className={classes.decorationSvg} viewBox="0 0 400 300">
                                <path
                                    className={classes.animatedPath}
                                    d="M50,250 Q100,200 80,150 T120,80"
                                    fill="none"
                                    stroke={product.color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    className={`${classes.animatedPath} ${classes.pathDelay}`}
                                    d="M350,50 Q300,100 320,150 T280,220"
                                    fill="none"
                                    stroke={product.color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>

                            {/* Mockup Container */}
                            <Box className={classes.mockupContainer}>
                                {/* Window Header */}
                                <Box className={classes.mockupHeader}>
                                    <Group gap={6}>
                                        <span className={classes.windowDot} style={{ background: '#ff5f57' }} />
                                        <span className={classes.windowDot} style={{ background: '#ffbd2e' }} />
                                        <span className={classes.windowDot} style={{ background: '#28c840' }} />
                                    </Group>
                                    <Text size="xs" c="rgba(255, 255, 255, 0.55)" ml="md">{product.name}</Text>
                                </Box>

                                {/* Mockup Content Placeholder */}
                                <Box className={classes.mockupContent}>
                                    <Box
                                        className={classes.mockupIcon}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: '50%',
                                            background: product.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <img
                                            src={product.logo}
                                            alt={product.name}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                objectFit: 'contain',
                                                filter: 'brightness(0) invert(1)',
                                            }}
                                        />
                                    </Box>
                                    <Text size="lg" fw={600} mt="md" c="white">
                                        {product.name}
                                    </Text>
                                    <Text size="sm" c="rgba(255, 255, 255, 0.5)" ta="center" maw={200}>
                                        Interface de demonstração
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Group>
            </Container>
        </section>
    );
}

export function ProductShowcase({ signupUrl }: ProductShowcaseProps) {
    return (
        <div className={classes.showcaseWrapper}>
            {/* Section Header */}
            <Container size="xl">
                <Title order={2} ta="center" className={classes.sectionTitle}>
                    Soluções de trabalho para equipes de alto desempenho
                </Title>
            </Container>

            {/* Product Sections */}
            {showcaseProducts.map((product, index) => (
                <ProductSection
                    key={product.id}
                    product={product}
                    index={index}
                    signupUrl={signupUrl}
                />
            ))}
        </div>
    );
}
