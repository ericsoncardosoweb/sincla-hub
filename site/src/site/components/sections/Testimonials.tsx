import { useState, useEffect } from 'react';
import { Container, Text, Box, Group, UnstyledButton } from '@mantine/core';
import { IconArrowRight, IconSparkles } from '@tabler/icons-react';
import classes from './Testimonials.module.css';

interface Testimonial {
    id: string;
    category: string;
    quote: string;
    author: string;
    role: string;
    company: string;
    companyLogo: string;
    avatarBg: string;
    decorColors: [string, string, string];
}

const testimonials: Testimonial[] = [
    {
        id: 'techsolutions',
        category: 'GRANDE EMPRESA',
        quote: 'Com a Sincla, centralizamos toda a gestão de RH e treinamentos em uma única plataforma, reduzindo 40% do tempo gasto em processos manuais.',
        author: 'CARLOS MENDES,',
        role: 'Diretor de Operações, TechSolutions Brasil',
        company: 'TechSolutions',
        companyLogo: 'TS',
        avatarBg: '#0087ff',
        decorColors: ['#10b981', '#0087ff', '#8b5cf6'],
    },
    {
        id: 'innovatech',
        category: 'EMPRESA',
        quote: 'O Sincla Recrutamento otimizou nossa atração de talentos. A triagem automática com IA e os testes comportamentais integrados reduziram o custo por contratação em 50%.',
        author: 'MARINA COSTA,',
        role: 'Head de R&S, InnovaTech Ltda',
        company: 'InnovaTech',
        companyLogo: 'IT',
        avatarBg: '#8b5cf6',
        decorColors: ['#8b5cf6', '#0087ff', '#10b981'],
    },
    {
        id: 'digitalcore',
        category: 'STARTUP',
        quote: 'Implementamos o Sincla EAD para treinar nossa equipe remota. A taxa de conclusão dos cursos aumentou de 30% para 85% em apenas 3 meses.',
        author: 'RAFAEL SANTOS,',
        role: 'Head de People & Culture, DigitalCore',
        company: 'DigitalCore',
        companyLogo: 'DC',
        avatarBg: '#FF6600',
        decorColors: ['#FF6600', '#10b981', '#0087ff'],
    },
];

const companyLogos = [
    { name: 'TechSolutions', logo: 'TS' },
    { name: 'InnovaTech', logo: 'IT' },
    { name: 'DigitalCore', logo: 'DC' },
];

export function Testimonials() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const activeTestimonial = testimonials[activeIndex];

    const handleLogoClick = (index: number) => {
        if (index === activeIndex || isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setActiveIndex(index);
            setIsAnimating(false);
        }, 300);
    };

    // Auto-rotate testimonials
    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % testimonials.length);
                setIsAnimating(false);
            }, 300);
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className={classes.testimonials}>
            <Container size="xl">
                <Box className={classes.content}>
                    {/* Avatar Side */}
                    <Box className={classes.avatarSide}>
                        <Box className={classes.avatarWrapper}>
                            {/* Decorative shapes */}
                            <Box
                                className={classes.decorShape1}
                                style={{ background: activeTestimonial.decorColors[0] }}
                            />
                            <Box
                                className={classes.decorShape2}
                                style={{ background: activeTestimonial.decorColors[1] }}
                            />
                            <Box
                                className={classes.decorShape3}
                                style={{ background: activeTestimonial.decorColors[2] }}
                            />

                            {/* Sparkles */}
                            <Box className={classes.sparkles}>
                                <IconSparkles size={16} className={classes.sparkle} />
                                <IconSparkles size={12} className={classes.sparkle} />
                                <IconSparkles size={14} className={classes.sparkle} />
                                <IconSparkles size={10} className={classes.sparkle} />
                            </Box>

                            {/* Connection line */}
                            <svg className={classes.connectionLine} viewBox="0 0 200 150">
                                <path
                                    d="M 20 80 Q 60 20 100 60 Q 140 100 180 40"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.3)"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                                <circle cx="20" cy="80" r="4" fill="rgba(255,255,255,0.6)" />
                                <circle cx="100" cy="60" r="4" fill="rgba(255,255,255,0.6)" />
                                <circle cx="180" cy="40" r="4" fill="rgba(255,255,255,0.6)" />
                            </svg>

                            {/* Avatar placeholder */}
                            <Box
                                className={`${classes.avatar} ${isAnimating ? classes.avatarAnimating : ''}`}
                                style={{ background: activeTestimonial.avatarBg }}
                            >
                                <Text className={classes.avatarText}>
                                    {activeTestimonial.author.charAt(0)}
                                </Text>
                            </Box>
                        </Box>
                    </Box>

                    {/* Quote Side */}
                    <Box className={classes.quoteSide}>
                        <Text
                            className={classes.category}
                            tt="uppercase"
                        >
                            {activeTestimonial.category}
                        </Text>

                        <Text
                            className={`${classes.quote} ${isAnimating ? classes.quoteAnimating : ''}`}
                        >
                            " {activeTestimonial.quote} "
                        </Text>

                        <Box className={classes.authorInfo}>
                            <Text className={classes.authorName}>
                                {activeTestimonial.author}
                            </Text>
                            <Text className={classes.authorRole}>
                                {activeTestimonial.role}
                            </Text>
                        </Box>

                        <UnstyledButton className={classes.caseStudyLink}>
                            Leia o estudo de caso da {activeTestimonial.company}.
                            <IconArrowRight size={16} />
                        </UnstyledButton>
                    </Box>
                </Box>

                {/* Company Logos */}
                <Box className={classes.logosSection}>
                    <Group justify="center" gap={0} className={classes.logosGrid}>
                        {companyLogos.map((company, index) => (
                            <UnstyledButton
                                key={company.name}
                                className={`${classes.logoItem} ${index === activeIndex ? classes.logoActive : ''}`}
                                onClick={() => handleLogoClick(index)}
                            >
                                <Box className={classes.logoBox}>
                                    <Text fw={700} size="lg">{company.logo}</Text>
                                </Box>
                                <Text size="xs" className={classes.logoName}>{company.name}</Text>
                            </UnstyledButton>
                        ))}
                    </Group>
                </Box>
            </Container>
        </section>
    );
}
