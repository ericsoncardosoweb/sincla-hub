import { useState } from 'react';
import { Box, Image, Center, ActionIcon } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import classes from './ProductVideoPlayer.module.css';

interface ProductVideoPlayerProps {
    videoUrl: string;       // URL do YouTube/Vimeo ou arquivo direto
    thumbnailUrl?: string;  // Imagem de capa customizada (opcional)
    productColor: string;   // Cor para o efeito glow neon
    productName: string;
}

export function ProductVideoPlayer({
    videoUrl,
    thumbnailUrl,
    productColor,
    productName,
}: ProductVideoPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    // Identificar se é um vídeo do YouTube
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    const ytId = getYouTubeId(videoUrl);

    const handlePlayClick = () => {
        setIsPlaying(true);
    };

    return (
        <Box 
            className={classes.playerWrapper}
            style={{ '--glow-color': productColor } as React.CSSProperties}
        >
            {!isPlaying ? (
                // Capa de Pré-carregamento (Lazy Load)
                <Box className={classes.thumbnailContainer} onClick={handlePlayClick}>
                    {thumbnailUrl ? (
                        <Image 
                            src={thumbnailUrl} 
                            alt={`Apresentação do ${productName}`}
                            className={classes.thumbnailImage}
                        />
                    ) : (
                        // Fallback elegante com gradiente e logo da ferramenta
                        <Box className={classes.thumbnailFallback}>
                            <Box className={classes.fallbackOverlay} />
                            <Box className={classes.fallbackPattern} />
                            <Center style={{ flexDirection: 'column' }}>
                                <div 
                                    className={classes.brandRing}
                                    style={{ borderColor: productColor }}
                                >
                                    <span className={classes.brandIndicator} style={{ background: productColor }} />
                                </div>
                            </Center>
                        </Box>
                    )}

                    {/* Botão de Play customizado com Glassmorphism */}
                    <div className={classes.playButtonWrapper}>
                        <ActionIcon
                            size={72}
                            radius="xl"
                            variant="filled"
                            className={classes.playButton}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                color: '#ffffff',
                                boxShadow: `0 0 30px ${productColor}4d`
                            }}
                        >
                            <IconPlayerPlay size={32} fill="#ffffff" stroke={1.5} />
                        </ActionIcon>
                    </div>

                    {/* Badge de Informação Visual */}
                    <div className={classes.videoBadge}>
                        <span className={classes.pulseDot} style={{ background: productColor }} />
                        Assistir Demonstração (3 min)
                    </div>
                </Box>
            ) : (
                // Reprodutor de Vídeo Ativo (Iframe)
                <Box className={classes.videoContainer}>
                    {ytId ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                            title={`Vídeo explicativo do ${productName}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className={classes.iframe}
                        />
                    ) : (
                        <video
                            src={videoUrl}
                            autoPlay
                            controls
                            className={classes.videoElement}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
}
