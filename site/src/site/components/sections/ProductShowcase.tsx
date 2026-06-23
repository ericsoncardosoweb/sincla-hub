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
        headline: 'A paz de espírito de um RH',
        subheadline: 'que roda no piloto automático',
        description: 'Esqueça as cobranças manuais de ponto, a bagunça em planilhas de férias e o estresse do fechamento da folha. Centralize e automatize toda a jornada dos colaboradores em um painel que trabalha por você.',
        ctaText: 'Começar agora',
        exploreText: 'Conheça o Sincla RH',
        color: '#0066CC',
        bgColor: 'rgba(0, 102, 204, 0.08)',
        testimonial: {
            logo: '🏢',
            company: 'TechCorp',
            text: 'O Sincla RH eliminou o trabalho manual de semanas. A gestão de ponto e a planilha de férias agora rodam sozinhas.',
            link: 'Veja a história.',
        },
    },
    {
        id: 'recrutamento',
        logo: '/logos/sincla-recrutamento.svg',
        name: 'Sincla Recrutamento',
        headline: 'Contrate a pessoa certa,',
        subheadline: 'sem palpites ou frustrações',
        description: 'Pare de desperdiçar horas analisando currículos frios que não se encaixam na sua cultura. Divulgue vagas nos maiores canais e use a inteligência artificial com Profiler comportamental DISC para identificar e filtrar o talento perfeito no funil visual.',
        ctaText: 'Testar gratuitamente',
        exploreText: 'Conheça o Recrutamento',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        testimonial: {
            logo: '🎯',
            company: 'VagaCerta',
            text: 'Descobrimos o candidato ideal em metade do tempo graças ao filtro comportamental DISC e à triagem automática de IA.',
            link: 'Leia a história.',
        },
    },
    {
        id: 'ead',
        logo: '/logos/sincla-ead.svg',
        name: 'Sincla EAD',
        headline: 'Capacite toda a sua equipe,',
        subheadline: 'sem repetir o mesmo treinamento',
        description: 'Chega de treinamentos maçantes gravados que ninguém assiste. Hospede cursos dinâmicos, organize trilhas de desenvolvimento focadas e ofereça certificados automáticos integrados à ficha do funcionário.',
        ctaText: 'Começar agora',
        exploreText: 'Conheça o Sincla EAD',
        color: '#FF6600',
        bgColor: 'rgba(255, 102, 0, 0.08)',
        testimonial: {
            logo: '🎓',
            company: 'Educorp',
            text: 'Treinamos e integramos 500 colaboradores com o Sincla EAD. A integração nativa ao cadastro de RH poupou dezenas de horas de configuração.',
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
                            <Text fw={600} size="lg" c="dark">
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
                                color="dark"
                                rightSection={<IconArrowRight size={16} />}
                                className={classes.ctaSecondary}
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
                                    <Text size="sm" className={classes.testimonialText}>
                                        <strong>{product.testimonial.company}</strong> {product.testimonial.text}{' '}
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
                                    <Text size="xs" c="dimmed" ml="md">{product.name}</Text>
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
                                    <Text size="lg" fw={600} mt="md" c="dark.7">
                                        {product.name}
                                    </Text>
                                    <Text size="sm" c="dimmed" ta="center" maw={200}>
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
