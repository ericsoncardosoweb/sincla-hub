import { IconBrandWhatsapp } from '@tabler/icons-react';
import classes from './WhatsappFloat.module.css';

export function WhatsappFloat() {
    const phoneNumber = '5511999999999'; // Placeholder configurado para WhatsApp do consultor
    const message = 'Olá! Gostaria de falar com um consultor sobre o ecossistema Sincla.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <a
            href={whatsappUrl}
            className={classes.whatsappFloat}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar com Consultor no WhatsApp"
        >
            <IconBrandWhatsapp size={28} stroke={1.8} />
            <span className={classes.tooltip}>
                Falar com Consultor
            </span>
        </a>
    );
}
