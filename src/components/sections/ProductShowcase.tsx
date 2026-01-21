import { useRef, useEffect, useState } from 'react';
import { Container, Title, Text, Button, Group, Box, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconUsers, IconCalendar, IconSchool, IconCash, IconBriefcase } from '@tabler/icons-react';
import classes from './ProductShowcase.module.css';

interface ProductShowcaseProps {
    onOpenModal: () => void;
}

// Dados dos produtos para showcase
const showcaseProducts = [
    {
        id: 'rh',
        icon: IconUsers,
        name: 'Sincla RH',
        headline: 'Gerencie sua equipe',
        subheadline: 'com inteligência',
        description: 'Controle ponto, férias, folha de pagamento e toda a jornada do colaborador em uma única plataforma com automação inteligente.',
        ctaText: 'Obtenha grátis',
        exploreText: 'Conheça o Sincla RH',
        color: '#0087ff',
        bgColor: 'rgba(0, 135, 255, 0.08)',
        testimonial: {
            logo: '🏢',
            company: 'TechCorp',
            text: 'O Sincla RH reduziu nosso tempo de gestão de pessoas em 60%. A automação de ponto e férias é fantástica.',
            link: 'Veja a história.',
        },
    },
    {
        id: 'agenda',
        icon: IconCalendar,
        name: 'Sincla Agenda',
        headline: 'Agendamentos',
        subheadline: 'que funcionam sozinhos',
        description: 'Seus clientes agendam online 24/7, você recebe notificações e lembretes automáticos. Sem conflitos, sem retrabalho.',
        ctaText: 'Obtenha grátis',
        exploreText: 'Conheça o Sincla Agenda',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.08)',
        testimonial: {
            logo: '💈',
            company: 'Barbearia Premium',
            text: 'Nossos clientes adoram agendar pelo celular. Reduzimos faltas em 40% com os lembretes automáticos.',
            link: 'Leia a história.',
        },
    },
    {
        id: 'ead',
        icon: IconSchool,
        name: 'Sincla EAD',
        headline: 'Treine sua equipe',
        subheadline: 'de forma escalável',
        description: 'Crie cursos, trilhas de aprendizado e acompanhe o desenvolvimento da sua equipe em tempo real com certificados automáticos.',
        ctaText: 'Obtenha grátis',
        exploreText: 'Conheça o Sincla EAD',
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        testimonial: {
            logo: '🎓',
            company: 'Educorp',
            text: 'Treinamos 500 colaboradores em 3 meses usando o Sincla EAD. A plataforma é intuitiva e completa.',
            link: 'Veja o case.',
        },
    },
    {
        id: 'bolso',
        icon: IconCash,
        name: 'Sincla Bolso',
        headline: 'Finanças pessoais',
        subheadline: 'sem complicação',
        description: 'Organize suas finanças, acompanhe gastos automaticamente e alcance seus objetivos financeiros com relatórios inteligentes.',
        ctaText: 'Obtenha grátis',
        exploreText: 'Conheça o Sincla Bolso',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.08)',
        testimonial: {
            logo: '💰',
            company: 'Usuário verificado',
            text: '"Finalmente consegui organizar minhas finanças. O app sincroniza tudo automaticamente e me mostra onde posso economizar."',
            link: 'Leia mais avaliações.',
        },
    },
    {
        id: 'leads',
        icon: IconBriefcase,
        name: 'Sincla Leads',
        headline: 'Capture clientes',
        subheadline: 'com IA integrada',
        description: 'Capture, qualifique e converta leads automaticamente com funis inteligentes, automação de follow-up e qualificação por IA.',
        ctaText: 'Obtenha grátis',
        exploreText: 'Conheça o Sincla Leads',
        color: '#ec4899',
        bgColor: 'rgba(236, 72, 153, 0.08)',
        testimonial: {
            logo: '🚀',
            company: 'StartupXYZ',
            text: 'Aumentamos nossa conversão em 150% usando os funis automatizados do Sincla Leads.',
            link: 'Veja a história.',
        },
    },
];

function ProductSection({ product, index, onOpenModal }: { product: typeof showcaseProducts[0]; index: number; onOpenModal: () => void }) {
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
                            <ThemeIcon
                                size={36}
                                radius="md"
                                style={{ background: product.color }}
                            >
                                <product.icon size={20} stroke={1.5} />
                            </ThemeIcon>
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
                                size="md"
                                radius="xl"
                                style={{ background: product.color }}
                                className={classes.ctaPrimary}
                                onClick={onOpenModal}
                            >
                                {product.ctaText}
                            </Button>
                            <Button
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
                                    <ThemeIcon
                                        size={60}
                                        radius="xl"
                                        style={{ background: product.color }}
                                        className={classes.mockupIcon}
                                    >
                                        <product.icon size={32} stroke={1.5} />
                                    </ThemeIcon>
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

export function ProductShowcase({ onOpenModal }: ProductShowcaseProps) {
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
                    onOpenModal={onOpenModal}
                />
            ))}
        </div>
    );
}
