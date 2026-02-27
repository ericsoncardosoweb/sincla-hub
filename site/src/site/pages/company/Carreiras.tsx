import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@mantine/core';
import {
    IconArrowLeft,
    IconArrowRight,
    IconBriefcase,
    IconCode,
    IconPalette,
    IconHeadset,
    IconChartBar,
    IconUsers,
    IconRocket,
    IconHeart,
    IconBulb,
    IconTarget,
    IconWorld,
    IconHome,
    IconClock,
    IconMapPin,
    IconCheck,
    IconSchool,
    IconMail,
} from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import { Footer } from '../../components/layout/Footer';
import styles from './Carreiras.module.css';

// Equipes/Departamentos
const teams = [
    { name: 'Engenharia', icon: IconCode, count: 12 },
    { name: 'Design', icon: IconPalette, count: 4 },
    { name: 'Produto', icon: IconRocket, count: 6 },
    { name: 'Sucesso do Cliente', icon: IconHeadset, count: 8 },
    { name: 'Marketing', icon: IconChartBar, count: 5 },
    { name: 'Pessoas & Cultura', icon: IconUsers, count: 3 },
];

// Valores da empresa
const values = [
    {
        icon: IconHeart,
        title: 'Cliente em primeiro lugar',
        description: 'Cada decisão que tomamos começa com uma pergunta: como isso beneficia nossos clientes?',
    },
    {
        icon: IconBulb,
        title: 'Inovação contínua',
        description: 'Questionamos o status quo e buscamos constantemente maneiras melhores de fazer as coisas.',
    },
    {
        icon: IconTarget,
        title: 'Excelência com propósito',
        description: 'Entregamos qualidade em tudo que fazemos, com foco no impacto real que geramos.',
    },
    {
        icon: IconUsers,
        title: 'Juntos somos mais fortes',
        description: 'Colaboração não é apenas uma palavra - é como construímos produtos incríveis.',
    },
];

// Vagas disponíveis
const jobs = [
    {
        title: 'Desenvolvedor Full Stack Senior',
        department: 'Engenharia',
        location: 'Remoto',
        type: 'Tempo integral',
    },
    {
        title: 'Product Designer',
        department: 'Design',
        location: 'São Paulo, SP',
        type: 'Tempo integral',
    },
    {
        title: 'Customer Success Manager',
        department: 'Sucesso do Cliente',
        location: 'Remoto',
        type: 'Tempo integral',
    },
    {
        title: 'Analista de Marketing Digital',
        department: 'Marketing',
        location: 'São Paulo, SP',
        type: 'Tempo integral',
    },
    {
        title: 'Engenheiro de Dados',
        department: 'Engenharia',
        location: 'Remoto',
        type: 'Tempo integral',
    },
    {
        title: 'Product Manager',
        department: 'Produto',
        location: 'Híbrido',
        type: 'Tempo integral',
    },
];

// Filtros de departamento
const filters = ['Todos', 'Engenharia', 'Design', 'Produto', 'Sucesso do Cliente', 'Marketing'];

export function Carreiras() {
    const [activeFilter, setActiveFilter] = useState('Todos');

    const filteredJobs = activeFilter === 'Todos'
        ? jobs
        : jobs.filter(job => job.department === activeFilter);

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
                <div className={styles.heroContent}>
                    <span className={styles.heroTagline}>CARREIRAS NA SINCLA</span>
                    <h1 className={styles.heroTitle}>
                        O futuro da Sincla<br />começa com você
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Junte-se a um time apaixonado por transformar a gestão empresarial.
                        Aqui, seu trabalho impacta milhares de empresas todos os dias.
                    </p>
                    <a href="#vagas" className={styles.heroCta}>
                        <IconBriefcase size={20} />
                        Ver todas as vagas
                    </a>

                    <div className={styles.heroStats}>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>150+</div>
                            <div className={styles.statLabel}>Colaboradores</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>38</div>
                            <div className={styles.statLabel}>Vagas abertas</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statNumber}>12</div>
                            <div className={styles.statLabel}>Países</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TEAMS SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Nossas equipes</h2>
                        <p className={styles.sectionSubtitle}>
                            Descubra onde você pode fazer a diferença. Cada equipe tem um papel
                            fundamental na construção dos produtos que nossos clientes amam.
                        </p>
                    </div>

                    <div className={styles.teamsGrid}>
                        {teams.map((team) => (
                            <div key={team.name} className={styles.teamCard}>
                                <div className={styles.teamIcon}>
                                    <team.icon size={32} />
                                </div>
                                <div className={styles.teamName}>{team.name}</div>
                                <div className={styles.teamCount}>{team.count} vagas abertas</div>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* VALUES SECTION */}
            <section className={`${styles.section} ${styles.sectionDark}`}>
                <Container size="xl">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Nossos valores</h2>
                        <p className={styles.sectionSubtitle}>
                            Os princípios que guiam cada decisão e definem quem somos como empresa.
                        </p>
                    </div>

                    <div className={styles.valuesGrid}>
                        {values.map((value) => (
                            <div key={value.title} className={styles.valueCard}>
                                <div className={styles.valueIcon}>
                                    <value.icon size={28} />
                                </div>
                                <h3 className={styles.valueTitle}>{value.title}</h3>
                                <p className={styles.valueDescription}>{value.description}</p>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* REMOTE WORK SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.remoteSection}>
                        <div className={styles.remoteContent}>
                            <span className={styles.remoteTag}>TRABALHO FLEXÍVEL</span>
                            <h2 className={styles.remoteTitle}>
                                Trabalhe de qualquer lugar
                            </h2>
                            <p className={styles.remoteDescription}>
                                Acreditamos que o melhor trabalho acontece quando você tem
                                flexibilidade. Nossa cultura remote-first permite que você
                                trabalhe de onde se sentir mais produtivo.
                            </p>
                            <div className={styles.remoteFeatures}>
                                <div className={styles.remoteFeature}>
                                    <IconCheck size={16} />
                                    100% Remoto
                                </div>
                                <div className={styles.remoteFeature}>
                                    <IconHome size={16} />
                                    Home Office Setup
                                </div>
                                <div className={styles.remoteFeature}>
                                    <IconClock size={16} />
                                    Horário Flexível
                                </div>
                                <div className={styles.remoteFeature}>
                                    <IconWorld size={16} />
                                    Time Global
                                </div>
                            </div>
                        </div>
                        <div className={styles.remoteVisual}>
                            <div className={styles.globeIcon}>
                                <IconWorld size={100} stroke={1} />
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* JOBS SECTION */}
            <section id="vagas" className={`${styles.section} ${styles.sectionDark}`}>
                <Container size="xl">
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Vagas abertas</h2>
                        <p className={styles.sectionSubtitle}>
                            Encontre a oportunidade perfeita para o próximo passo da sua carreira.
                        </p>
                    </div>

                    <div className={styles.jobsFilters}>
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                className={`${styles.filterButton} ${activeFilter === filter ? styles.filterButtonActive : ''}`}
                                onClick={() => setActiveFilter(filter)}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className={styles.jobsGrid}>
                        {filteredJobs.map((job, index) => (
                            <div key={index} className={styles.jobCard}>
                                <div className={styles.jobHeader}>
                                    <h3 className={styles.jobTitle}>{job.title}</h3>
                                    <span className={styles.jobBadge}>{job.department}</span>
                                </div>
                                <div className={styles.jobMeta}>
                                    <div className={styles.jobMetaItem}>
                                        <IconMapPin size={16} />
                                        {job.location}
                                    </div>
                                    <div className={styles.jobMetaItem}>
                                        <IconClock size={16} />
                                        {job.type}
                                    </div>
                                </div>
                                <a href="#" className={styles.jobApply}>
                                    Candidatar-se
                                    <IconArrowRight size={16} />
                                </a>
                            </div>
                        ))}
                    </div>
                </Container>
            </section>

            {/* EARLY CAREER SECTION */}
            <section className={styles.section}>
                <Container size="xl">
                    <div className={styles.earlyCareerContent}>
                        <div className={styles.earlyCareerText}>
                            <h2 className={styles.earlyCareerTitle}>
                                Início de carreira
                            </h2>
                            <p className={styles.earlyCareerDescription}>
                                Está começando sua jornada profissional? Temos programas especiais
                                para estágio e trainee, com mentoria dedicada e oportunidades reais
                                de crescimento. Aprenda com os melhores e construa sua carreira conosco.
                            </p>
                            <a href="#" className={styles.earlyCareerCta}>
                                Conhecer programas
                                <IconArrowRight size={16} />
                            </a>
                        </div>
                        <div className={styles.earlyCareerVisual}>
                            <div className={styles.graduationIcon}>
                                <IconSchool size={80} stroke={1.5} />
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* COMMUNITY CTA SECTION */}
            <section className={styles.communityCta}>
                <Container size="md">
                    <h2 className={styles.communityTitle}>
                        Não encontrou a vaga ideal?
                    </h2>
                    <p className={styles.communityDescription}>
                        Cadastre-se na nossa comunidade de talentos e seja o primeiro
                        a saber sobre novas oportunidades.
                    </p>
                    <a href="#" className={styles.communityButton}>
                        <IconMail size={20} />
                        Entrar na comunidade
                    </a>
                </Container>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}
