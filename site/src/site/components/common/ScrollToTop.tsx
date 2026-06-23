import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Rolar a tela imediatamente para o topo sem rolagem suave para evitar o efeito "pulo" no carregamento da nova rota
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
