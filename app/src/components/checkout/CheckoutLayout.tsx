import { Outlet } from 'react-router-dom';
import styles from './CheckoutLayout.module.css';

/**
 * Layout independente para o Checkout — sem sidebar, header ou footer do dashboard
 */
export function CheckoutLayout() {
    return (
        <div className={styles.wrapper}>
            <Outlet />
        </div>
    );
}
