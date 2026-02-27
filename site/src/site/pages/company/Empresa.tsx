import { Link } from 'react-router-dom';
import { Container } from '@mantine/core';
import {
    IconArrowLeft,
    IconArrowRight,
    IconUsers,
    IconWorld,
    IconHeart,
    IconBuildingSkyscraper,
    IconApps,
    IconUsersGroup,
    IconEye,
    IconLink,
    IconBulb,
    IconTarget,
    IconShieldCheck,
    IconHeartHandshake,
    IconBriefcase,
    IconTrophy,
    IconLeaf,
    IconSettings,
} from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import { Footer } from '../../components/layout/Footer';
import styles from './Empresa.module.css';

// Estatísticas da empresa
const stats = [
    { icon: IconUsers, number: '150+', label: 'Colaboradores em todo Brasil' },
    { icon: IconWorld, number: '12', label: 'Estados atendidos' },
    { icon: IconHeart, number: '5.000+', label: 'Clientes satisfeitos' },
    { icon: IconApps, number: '6', label: 'Produtos integrados' },
    { icon: IconBuildingSkyscraper, number: '50M+', label: 'Transações processadas' },
    { icon: IconUsersGroup, number: '100K+', label: 'Usuários ativos' },
];

// Timeline da empresa
const timeline = [
    { year: '2020', event: 'Fundação da Sincla com foco em gestão de RH' },
    { year: '2021', event: 'Lançamento do Sincla EAD e expansão nacional' },
    { year: '2022', event: 'Sincla Bolso e integração financeira' },
    { year: '2023', event: 'Marketplace e ecossistema de parceiros' },
    { year: '2024', event: 'IA integrada e automação inteligente' },
    { year: '2025', event: 'Expansão internacional em andamento' },
];

// Valores da empresa
const values = [
    { icon: IconEye, title: 'Transparência total' },
    { icon: IconUsersGroup, title: 'Trabalho em equipe' },
    { icon: IconHeart, title: 'Paixão pelo cliente' },
    { icon: IconBulb, title: 'Inovação constante' },
    { icon: IconTarget, title: 'Foco em resultados' },
    { icon: IconShieldCheck, title: 'Integridade sempre' },
];

// Compromissos
const commitments = [
    {
        icon: IconHeartHandshake,
        title: 'Compromisso Social',
        description: 'Destinamos parte dos nossos recursos para apoiar iniciativas educacionais e de capacitação profissional em comunidades carentes.',
    },
    {
        icon: IconTrophy,
        title: 'Fundação Sincla',
        description: 'Criamos a Fundação Sincla para tornar o mundo um lugar melhor, estabelecendo parcerias com organizações locais e globais.',
    },
    {
        icon: IconBriefcase,
        title: 'Junte-se ao nosso time',
        description: 'Na Sincla, todos são incentivados a serem autênticos. Estamos construindo uma empresa onde cada membro se sinta acolhido.',
    },
    {
        icon: IconLeaf,
        title: 'Sustentabilidade',
        description: 'A Sincla foi criada para ser aberta, inclusiva, justa e sustentável. Nos guiamos por princípios éticos em todas as decisões.',
    },
];

// Artigos
const articles = [
    { tag: 'CULTURA SINCLA', title: 'Como construímos uma cultura de inovação e colaboração em equipe' },
    { tag: 'POSTAGEM NO BLOG', title: 'O novo relatório de diversidade mostra nosso progresso e desafios' },
    { tag: 'ARTIGO', title: '5 maneiras de melhorar a colaboração priorizando a cultura' },
    { tag: 'POSTAGEM NO BLOG', title: 'Vamos abrir o trabalho, juntos - nossa filosofia de transparência' },
];

export function Empresa() {
    return (
        <div className={styles.pageWrapper}>
            <SignatureVisual />

            {/* Back Link */}
            <Link to="/" className={styles.backLink}>
                <IconArrowLeft size={16} />
                Voltar para o início
            </Link>

            {/* HERO SECTION */}
            <section className={styles.heroSection}>
                <Container size="xl">
                    <div className={styles.heroContainer}>
                        <div className={styles.heroContent}>
                            <span className={styles.heroTagline}>QUEM SOMOS NÓS</span>
                            <h1 className={styles.heroTitle}>
                                Ajudamos empresas a transformar sua gestão.
                            </h1>
                            <p className={styles.heroText}>
                                Por trás de toda grande empresa, existe uma{' '}
                                <span className={styles.heroHighlight}>equipe bem gerenciada</span>.
                            </p>
                            <p className={styles.heroText}>
                                Da pequena empresa ao grande grupo empresarial, nossos produtos ajudam
                                organizações em todo o Brasil a impulsionar seus resultados por meio
                                do poder da tecnologia.
                            </p>
                            <p className={styles.heroText}>
                                Nossa missão é{' '}
                                <span className={styles.heroHighlight}>liberar o potencial de cada equipe</span>{' '}
                                por meio de ferramentas inteligentes e integradas.
                            </p>
                        </div>
                        <div className={styles.heroVisual}>
                            <div className={styles.heroIllustration}>
                                <div className={`${styles.heroCircle} ${styles.heroCircle1}`}></div>
                                <div className={`${styles.heroCircle} ${styles.heroCircle2}`}></div>
                                <div className={`${styles.heroCircle} ${styles.heroCircle3}`}></div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* STATS SECTION */}
            <section className={styles.statsSection}>
                <Container size="xl">
                    <div className={styles.statsGrid}>
                        {stats.map((stat, index) => (
                            <div key={index} className={styles.statItem}>
                                <div className={styles.statIcon}>
                                    <stat.icon size={24} />
                                </div>
                                <div className={styles.statContent}>
                                    <div className={styles.statNumber}>{stat.number}</div>
                                    <div className={styles.statLabel}>{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* HISTORY SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.historyContent}>
                        <div className={styles.historyText}>
                            <h2 className={styles.historyTitle}>Uma breve história</h2>
                            <p className={styles.historyParagraph}>
                                Munidos de uma ideia e um sonho, um grupo de empreendedores decidiu
                                criar a Sincla. Em 2020, eles não sabiam que tipo de empresa seria,
                                mas sabiam exatamente o que ela não deveria ser: complicada.
                            </p>
                            <p className={styles.historyParagraph}>
                                Poucos anos depois, nos tornamos uma empresa em crescimento com
                                colaboradores em todo o Brasil, mas nossas ambições iniciais
                                permanecem as mesmas: simplificar a gestão empresarial.
                            </p>
                            <p className={styles.historyParagraph}>
                                Esta é a nossa história:
                            </p>
                        </div>
                        <div className={styles.historyTimeline}>
                            {timeline.map((item, index) => (
                                <div key={index} className={styles.timelineItem}>
                                    <span className={styles.timelineYear}>{item.year}</span>
                                    <span className={styles.timelineEvent}>{item.event}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>
            </section>

            {/* TWO CARDS SECTION */}
            <section className={`${styles.section} ${styles.sectionDark}`}>
                <Container size="xl">
                    <div className={styles.twoCardsGrid}>
                        <div className={styles.linkCard}>
                            <div className={styles.linkCardIcon}>
                                <IconUsersGroup size={48} />
                            </div>
                            <h3 className={styles.linkCardTitle}>
                                Conheça a equipe por trás dos produtos.
                            </h3>
                            <p className={styles.linkCardDescription}>
                                Nossos colaboradores são o coração da Sincla. Conheça os criadores
                                e inovadores únicos que estão na vanguarda.
                            </p>
                            <Link to="/carreiras" className={styles.linkCardCta}>
                                Conheça nossa equipe <IconArrowRight size={16} />
                            </Link>
                        </div>
                        <div className={styles.linkCard}>
                            <div className={styles.linkCardIcon}>
                                <IconLink size={48} />
                            </div>
                            <h3 className={styles.linkCardTitle}>
                                Conecte-se com a comunidade Sincla.
                            </h3>
                            <p className={styles.linkCardDescription}>
                                Todos os colegas de equipe que você nem sabia que tinha,
                                reunidos em um só lugar para trocar experiências.
                            </p>
                            <Link to="/comunidade" className={styles.linkCardCta}>
                                Encontre sua comunidade <IconArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>

            {/* VALUES SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.valuesLayout}>
                        <div className={styles.valuesText}>
                            <span className={styles.valuesTagline}>NO QUE ACREDITAMOS</span>
                            <h2 className={styles.valuesTitle}>Valores pelos quais viver</h2>
                            <p className={styles.valuesDescription}>
                                Nossos valores únicos descrevem, em sua essência, o que defendemos.
                                Esses valores moldam nossa cultura, influenciam quem somos, o que
                                fazemos e até mesmo quem contratamos.
                            </p>
                            <p className={styles.valuesDescription}>
                                Eles estão intrinsecamente ligados ao nosso DNA e permanecerão os
                                mesmos à medida que continuarmos a crescer.
                            </p>
                            <a href="#" className={styles.valuesCta}>
                                Saber mais <IconArrowRight size={16} />
                            </a>
                        </div>
                        <div className={styles.valuesGrid}>
                            {values.map((value, index) => (
                                <div key={index} className={styles.valueCard}>
                                    <div className={styles.valueIcon}>
                                        <value.icon size={36} stroke={1.5} />
                                    </div>
                                    <h4 className={styles.valueTitle}>{value.title}</h4>
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>
            </section>

            {/* HIGHLIGHT SECTION */}
            <section className={styles.highlightSection}>
                <Container size="md">
                    <div className={styles.highlightIcon}>
                        <IconHeart size={64} stroke={1.5} />
                    </div>
                    <h2 className={styles.highlightTitle}>Nós amamos empresas!</h2>
                    <p className={styles.highlightSubtitle}>
                        Mais de 5.000 clientes usam a Sincla para capacitar suas equipes.
                    </p>
                    <p className={styles.highlightText}>
                        Levamos a sério o lema "O cliente é a razão de tudo". É por isso que
                        criamos nossos produtos de forma que todas as empresas possam adquiri-los.
                        Eles nos inspiram, nos desafiam e, por sua vez, nos ajudam a criar
                        produtos melhores.
                    </p>
                    <a href="#" className={styles.highlightCta}>
                        Saiba mais sobre nossos clientes <IconArrowRight size={16} />
                    </a>
                </Container>
            </section>

            {/* COMMITMENTS SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.commitmentsGrid}>
                        {commitments.map((item, index) => (
                            <div key={index} className={styles.commitmentCard}>
                                <div className={styles.commitmentIcon}>
                                    <item.icon size={32} />
                                </div>
                                <div className={styles.commitmentContent}>
                                    <h3 className={styles.commitmentTitle}>{item.title}</h3>
                                    <p className={styles.commitmentDescription}>{item.description}</p>
                                    <a href="#" className={styles.commitmentCta}>
                                        Saber mais <IconArrowRight size={14} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* HOW WE WORK SECTION */}
            <section className={`${styles.section} ${styles.sectionDark}`}>
                <Container size="xl">
                    <div className={styles.howWeWorkContent}>
                        <div className={styles.howWeWorkText}>
                            <span className={styles.howWeWorkTagline}>COMO TRABALHAMOS</span>
                            <h2 className={styles.howWeWorkTitle}>Em funcionamento</h2>
                            <p className={styles.howWeWorkParagraph}>
                                Acreditamos que todas as equipes têm potencial para realizar
                                coisas incríveis quando o trabalho é aberto.
                            </p>
                            <p className={styles.howWeWorkParagraph}>
                                Grande parte do mundo funciona, muitas vezes sem perceber, de forma
                                fechada. Informações são ocultadas ou perdidas, os laços entre equipes
                                são frágeis. O resultado? O potencial é desperdiçado.
                            </p>
                            <p className={styles.howWeWorkParagraph}>
                                É por isso que a abertura importa. É por isso que fazemos o que
                                fazemos na Sincla. O trabalho transparente sempre foi fundamental
                                para os nossos valores.
                            </p>
                        </div>
                        <div className={styles.howWeWorkVisual}>
                            <div className={styles.howWeWorkIllustration}>
                                <div className={`${styles.workCircle} ${styles.workCircle1}`}></div>
                                <div className={`${styles.workCircle} ${styles.workCircle2}`}></div>
                                <div className={styles.workIcon}>
                                    <IconSettings size={48} stroke={1.5} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* ARTICLES SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.articlesLayout}>
                        <div className={styles.articlesHeader}>
                            <h2 className={styles.articlesTitle}>
                                Mudando a forma como as equipes trabalham juntas.
                            </h2>
                            <p className={styles.articlesDescription}>
                                O trabalho aberto não é apenas uma filosofia, é uma prática.
                                Explore nossa pesquisa e reflexões originais.
                            </p>
                        </div>
                        <div className={styles.articlesGrid}>
                            {articles.map((article, index) => (
                                <div key={index} className={styles.articleCard}>
                                    <span className={styles.articleTag}>{article.tag}</span>
                                    <h3 className={styles.articleTitle}>{article.title}</h3>
                                    <a href="#" className={styles.articleCta}>
                                        Leia mais <IconArrowRight size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}
