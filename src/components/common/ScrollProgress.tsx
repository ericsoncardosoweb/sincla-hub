import { useEffect, useState } from 'react';
import classes from './ScrollProgress.module.css';

export function ScrollProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            setProgress(scrollPercent);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={classes.progressContainer}>
            <div
                className={classes.progressBar}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
