import { SimpleGrid, Card, Text, Group, Button, ThemeIcon, Badge } from '@mantine/core';
import { IconCertificate, IconVideo, IconUsers, IconTrophy, IconClock, IconStar } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const courses = [
    {
        title: 'Sincla Fundamentals',
        level: 'Iniciante',
        duration: '4 horas',
        modules: 8,
        rating: 4.9,
        students: 12500,
        color: 'teal',
    },
    {
        title: 'Sincla RH Avançado',
        level: 'Avançado',
        duration: '8 horas',
        modules: 15,
        rating: 4.8,
        students: 5200,
        color: 'blue',
    },
    {
        title: 'Sincla Leads Masterclass',
        level: 'Intermediário',
        duration: '6 horas',
        modules: 12,
        rating: 4.9,
        students: 7800,
        color: 'violet',
    },
    {
        title: 'Administração da Plataforma',
        level: 'Avançado',
        duration: '10 horas',
        modules: 18,
        rating: 4.7,
        students: 3400,
        color: 'orange',
    },
];

const certifications = [
    {
        name: 'Sincla Certified User',
        description: 'Certificação básica para usuários da plataforma',
        duration: '2 horas',
        price: 'Gratuito',
    },
    {
        name: 'Sincla Certified Professional',
        description: 'Para profissionais que implementam soluções',
        duration: '4 horas',
        price: 'R$ 199',
    },
    {
        name: 'Sincla Certified Expert',
        description: 'Nível máximo de expertise na plataforma',
        duration: '6 horas',
        price: 'R$ 399',
    },
];

export function Treinamento() {
    return (
        <PageTemplate
            title="Treinamento e Certificação"
            subtitle="Desenvolva suas habilidades e torne-se um especialista Sincla"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Saiba Mais' },
                { label: 'Treinamento' },
            ]}
        >
            {/* Stats */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl">
                {[
                    { icon: IconVideo, value: '50+', label: 'Cursos' },
                    { icon: IconUsers, value: '100k+', label: 'Alunos' },
                    { icon: IconCertificate, value: '25k+', label: 'Certificados' },
                    { icon: IconTrophy, value: '4.8', label: 'Avaliação média' },
                ].map((stat, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        ta="center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                            border: '1px solid rgba(0, 135, 255, 0.2)',
                        }}
                    >
                        <ThemeIcon size={40} radius="md" variant="light" color="blue" mx="auto" mb="sm">
                            <stat.icon size={20} />
                        </ThemeIcon>
                        <Text fw={700} size="xl" c="white">{stat.value}</Text>
                        <Text size="sm" c="dimmed">{stat.label}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Courses */}
            <Text fw={600} size="lg" c="white" mb="md">
                Cursos em Destaque
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
                {courses.map((course, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <Badge color={course.color} variant="light">{course.level}</Badge>
                            <Group gap={4}>
                                <IconStar size={14} color="#ffc107" fill="#ffc107" />
                                <Text size="sm" c="white">{course.rating}</Text>
                            </Group>
                        </Group>
                        <Text fw={600} size="lg" c="white" mb="xs">{course.title}</Text>
                        <Group gap="lg" mb="md">
                            <Group gap="xs">
                                <IconClock size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">{course.duration}</Text>
                            </Group>
                            <Group gap="xs">
                                <IconVideo size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">{course.modules} módulos</Text>
                            </Group>
                            <Group gap="xs">
                                <IconUsers size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">{course.students.toLocaleString()} alunos</Text>
                            </Group>
                        </Group>
                        <Button variant="light" color={course.color} fullWidth>
                            Iniciar curso
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Certifications */}
            <Text fw={600} size="lg" c="white" mb="md">
                Certificações Oficiais
            </Text>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {certifications.map((cert, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <ThemeIcon
                            size={50}
                            radius="md"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            mb="md"
                        >
                            <IconCertificate size={24} />
                        </ThemeIcon>
                        <Text fw={600} c="white" mb="xs">{cert.name}</Text>
                        <Text size="sm" c="dimmed" mb="md">{cert.description}</Text>
                        <Group justify="space-between" mb="md">
                            <Text size="sm" c="dimmed">Duração: {cert.duration}</Text>
                            <Badge color={cert.price === 'Gratuito' ? 'teal' : 'blue'} variant="light">
                                {cert.price}
                            </Badge>
                        </Group>
                        <Button variant="light" color="blue" fullWidth>
                            Fazer exame
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
