/**
 * Checkout Page — Sincla Hub
 *
 * Layout independente estilo Stripe: Resumo + Pagamento
 * Integração Asaas via Edge Function
 *
 * URL: /checkout?produto=ID&plano=SLUG&ciclo=monthly|annual
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from '@mantine/core';
import {
    IconArrowLeft, IconShieldCheck, IconCreditCard,
    IconQrcode, IconCheck, IconLock, IconCalendar,
    IconUser, IconMapPin, IconCopy,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import {
    createSubscription,
    checkPixPaymentStatus,
    validateDocument,
    detectCardBrand,
    formatDocument,
    formatCardNumber,
    formatExpiry,
    formatCurrency,
    type CardBrand,
} from '../../shared/services/asaasService';
import { getAddressByCep, formatCep } from '../../shared/services/viaCepService';
import styles from './CheckoutPage.module.css';

interface PlanInfo {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    discount_yearly_percent: number;
    features: string[];
}

interface ProductInfo {
    id: string;
    name: string;
    brand_color: string | null;
    icon: string;
}

// const brandLabels: Record<CardBrand, string> = {
//     visa: 'Visa',
//     mastercard: 'Mastercard',
//     amex: 'Amex',
//     elo: 'Elo',
//     hipercard: 'Hipercard',
//     diners: 'Diners',
//     discover: 'Discover',
//     unknown: '',
// };

function CardBrandIcon({ brand }: { brand: CardBrand }) {
    switch (brand) {
        case 'mastercard':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#EB001B" />
                    <circle cx="28" cy="16" r="14" fill="#F79E1B" opacity="0.8" />
                </svg>
            );
        case 'visa':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.46 22H10.15L13.31 2H18.62L15.46 22ZM37.95 2.18L32.88 15.58L31.69 11.2C31.54 10.74 31.2 10 30.29 10C26.54 10 20.37 9.87 20.37 9.87L22.18 2H27.56L30.72 15L34.2 2.18H37.95ZM32.61 22L35.6 15H42.74L40.76 22H32.61ZM27.02 22H21.57L23.49 12H28.94L27.02 22ZM9.08 2H0.25L0 4.29C3.12 5.16 6.64 6.7 8.35 8C8.83 8.36 9.07 8.61 9.38 9.55L11.75 22H17.29L9.08 2Z" fill="#1434CB" />
                </svg>
            );
        case 'amex':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="44" height="32" rx="4" fill="#006FCF" />
                    <text x="22" y="21" fill="#fff" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" textAnchor="middle">AMEX</text>
                </svg>
            );
        case 'elo':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="22" cy="16" r="14" fill="#000" />
                    <text x="22" y="21" fill="#fff" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" textAnchor="middle">elo</text>
                </svg>
            );
        case 'hipercard':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="44" height="32" rx="4" fill="#C8102E" />
                    <text x="22" y="20" fill="#fff" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9" textAnchor="middle">HIPER</text>
                </svg>
            );
        case 'diners':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="44" height="32" rx="4" fill="#004B87" />
                    <text x="22" y="20" fill="#fff" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" textAnchor="middle">DINERS</text>
                </svg>
            );
        case 'discover':
            return (
                <svg viewBox="0 0 44 32" width="36" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="44" height="32" rx="4" fill="#E55C20" />
                    <text x="22" y="20" fill="#fff" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" textAnchor="middle">DISCOVER</text>
                </svg>
            );
        default:
            return <IconCreditCard size={24} color="#adb5bd" />;
    }
}

export function CheckoutPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { currentCompany, user } = useAuth();

    // URL params
    const productId = searchParams.get('produto') || '';
    const planSlug = searchParams.get('plano') || '';
    const initialCycle = searchParams.get('ciclo') || 'monthly';
    const returnTo = `/painel/assinaturas?produto=${productId}`;
    const successReturnTo = `/painel/assinaturas?produto=${productId}&sucesso=true`;

    // Data
    const [product, setProduct] = useState<ProductInfo | null>(null);
    const [plan, setPlan] = useState<PlanInfo | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    // Form state
    const [selectedCycle, setSelectedCycle] = useState(initialCycle);
    const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Card form
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardBrand, setCardBrand] = useState<CardBrand>('unknown');
    const [cardError, setCardError] = useState<string | null>(null);

    const [cpfCnpj, setCpfCnpj] = useState('');
    const [cpfError, setCpfError] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState<string | null>(null);

    // Address
    const [cep, setCep] = useState('');
    const [addressData, setAddressData] = useState({ logradouro: '', numero: '', bairro: '', cidade: '', estado: '' });
    const [loadingCep, setLoadingCep] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [showAddress, setShowAddress] = useState(false);

    // PIX
    const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; paymentId: string } | null>(null);
    const [pollingPayment, setPollingPayment] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ===== Load data & Security =====
    useEffect(() => {
        loadCheckoutData();

        // Bloqueio de DevTools e Clique Direito
        const handleKeyDown = (e: KeyboardEvent) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
            }
            // Ctrl+Shift+I (Inspecionar) / Mac: Cmd+Option+I
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
                e.preventDefault();
            }
            // Ctrl+Shift+J (Console) / Mac: Cmd+Option+J
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
            }
            // Ctrl+Shift+C (Inspecionar Elemento) / Mac: Cmd+Option+C
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
            }
            // Ctrl+U (Ver código-fonte) / Mac: Cmd+Option+U
            if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
                e.preventDefault();
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const loadCheckoutData = async () => {
        if (!productId || !planSlug) {
            navigate('/painel/assinaturas');
            return;
        }
        try {
            const [prodRes, planRes] = await Promise.all([
                supabase.from('products').select('id, name, brand_color, icon').eq('id', productId).single(),
                supabase.from('product_plans')
                    .select('id, name, slug, price_monthly, price_yearly, discount_yearly_percent, features')
                    .eq('product_id', productId)
                    .eq('slug', planSlug)
                    .single(),
            ]);
            setProduct(prodRes.data);
            setPlan(planRes.data);
        } catch (err) {
            console.error('Error loading checkout data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    // ===== Handlers =====
    const handleCpfChange = (value: string) => {
        setCpfCnpj(formatDocument(value));
        setCpfError(null);
    };

    const handlePhoneChange = (value: string) => {
        let v = value.replace(/\D/g, '');
        if (v.length <= 10) {
            v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
            v = v.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
            v = v.replace(/(\d{5})(\d)/, '$1-$2');
        }
        setPhone(v.slice(0, 15));
        setPhoneError(null);
    };

    const handleCardNumberChange = (value: string) => {
        setCardNumber(formatCardNumber(value));
        setCardBrand(detectCardBrand(value.replace(/\D/g, '')));
        setCardError(null);
    };

    const handleExpiryChange = (value: string) => {
        setCardExpiry(formatExpiry(value));
    };

    const handleCepChange = async (value: string) => {
        const formatted = formatCep(value);
        setCep(formatted);
        setCepError(null);

        const clean = value.replace(/\D/g, '');
        if (clean.length === 8) {
            setLoadingCep(true);
            const result = await getAddressByCep(clean);
            if (result) {
                setAddressData({
                    logradouro: result.address,
                    numero: '',
                    bairro: result.province,
                    cidade: result.city,
                    estado: result.state,
                });
                setShowAddress(true);
            } else {
                setCepError('CEP não encontrado');
                setShowAddress(true);
            }
            setLoadingCep(false);
        }
    };

    const validateForm = (): boolean => {
        const doc = validateDocument(cpfCnpj);
        if (!doc.valid) {
            setCpfError('Documento inválido');
            return false;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            setPhoneError('Telefone com DDD inválido');
            return false;
        }

        if (paymentMethod === 'CREDIT_CARD') {
            if (cardNumber.replace(/\D/g, '').length < 13) {
                setCardError('Número do cartão inválido');
                return false;
            }
            if (!cardName.trim()) {
                setCardError('Nome do titular obrigatório');
                return false;
            }
            if (cardExpiry.length < 5) {
                setCardError('Validade inválida');
                return false;
            }
            if (cardCvv.length < 3) {
                setCardError('CVV inválido');
                return false;
            }
            if (cep.replace(/\D/g, '').length !== 8) {
                setCepError('CEP obrigatório');
                return false;
            }
        }
        return true;
    };

    const startPixPolling = (paymentId: string) => {
        setPollingPayment(true);
        pollingRef.current = setInterval(async () => {
            try {
                const status = await checkPixPaymentStatus(paymentId);
                if (status.paid) {
                    clearInterval(pollingRef.current!);
                    setPollingPayment(false);
                    setSuccess(true);
                    setTimeout(() => navigate(successReturnTo), 2500);
                }
            } catch { /* keep polling */ }
        }, 5000);
    };

    const handleSubmit = async () => {
        if (!validateForm() || !plan || !currentCompany) return;

        setLoading(true);
        setError(null);

        try {
            const [expiryMonth, expiryYear] = cardExpiry.split('/');
            const cycle = selectedCycle === 'annual' ? 'YEARLY' as const : 'MONTHLY' as const;

            const result = await createSubscription({
                planId: plan.id,
                productId,
                companyId: currentCompany.id,
                billingType: paymentMethod,
                cycle,
                customerName: user?.user_metadata?.full_name || user?.email || '',
                customerEmail: user?.email || '',
                customerCpfCnpj: cpfCnpj.replace(/\D/g, ''),
                customerPhone: phone.replace(/\D/g, ''),
                ...(paymentMethod === 'CREDIT_CARD' ? {
                    creditCard: {
                        holderName: cardName,
                        number: cardNumber.replace(/\D/g, ''),
                        expiryMonth: expiryMonth?.padStart(2, '0') || '',
                        expiryYear: expiryYear?.length === 2 ? `20${expiryYear}` : expiryYear || '',
                        ccv: cardCvv,
                    },
                    creditCardHolderInfo: {
                        name: cardName,
                        email: user?.email || '',
                        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
                        postalCode: cep.replace(/\D/g, ''),
                        addressNumber: addressData.numero || '0',
                        phone: phone.replace(/\D/g, ''),
                    },
                } : {}),
            });

            if (!result.success) {
                throw new Error(result.error || 'Erro ao processar pagamento');
            }

            if (paymentMethod === 'PIX' && result.pixQrCode) {
                setPixData({
                    qrCode: `data:image/png;base64,${result.pixQrCode}`,
                    copyPaste: result.pixCopyPaste || '',
                    paymentId: result.paymentId || '',
                });
                if (result.paymentId) startPixPolling(result.paymentId);
            } else {
                setSuccess(true);
                setTimeout(() => navigate(successReturnTo), 2500);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar pagamento');
        } finally {
            setLoading(false);
        }
    };

    const price = plan ? (selectedCycle === 'annual' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly) : 0;
    const color = product?.brand_color || '#228be6';

    // ===== LOADING =====
    if (loadingData) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingFull}>
                    <Loader size="lg" />
                    <span style={{ color: '#868e96' }}>Carregando checkout...</span>
                </div>
            </div>
        );
    }

    // ===== NOT FOUND =====
    if (!plan || !product) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingFull}>
                    <h3>Plano não encontrado</h3>
                    <button className={styles.btnBack} onClick={() => navigate('/painel/assinaturas')}>
                        <IconArrowLeft size={16} /> Voltar
                    </button>
                </div>
            </div>
        );
    }

    // ===== SUCCESS =====
    if (success) {
        return (
            <div className={styles.page}>
                <div className={styles.successFull}>
                    <div className={styles.successIcon}>
                        <IconCheck size={36} />
                    </div>
                    <h2>Pagamento confirmado!</h2>
                    <p>Sua assinatura foi processada com sucesso.</p>
                    <div className={styles.successDetails}>
                        <span>{plan.name}</span>
                        <span className={styles.successPrice}>{formatCurrency(price)}</span>
                    </div>
                    <p className={styles.redirectMsg}>Redirecionando...</p>
                </div>
            </div>
        );
    }

    // ===== MAIN CHECKOUT =====
    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.btnBack} onClick={() => navigate(returnTo)}>
                    <IconArrowLeft size={16} /> Voltar
                </button>
                <div className={styles.logo}>
                    <img src="/logos/logo-sincla.svg" alt="Sincla" style={{ minHeight: 55 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className={styles.security}>
                    <IconShieldCheck size={16} /> Pagamento seguro
                </div>
            </header>

            <div className={styles.container}>
                {/* Left — Summary */}
                <div className={styles.summary}>
                    <button className={styles.summaryBack} onClick={() => navigate(returnTo)}>
                        <IconArrowLeft size={14} /> {product.name}
                    </button>

                    <div style={{ marginBottom: 4 }}>
                        <span className={styles.priceMain}>{formatCurrency(price)}</span>
                        <span className={styles.pricePeriod}>
                            por {selectedCycle === 'annual' ? 'ano' : 'mês'}
                        </span>
                    </div>

                    <div className={styles.lineItem}>
                        <div className={styles.lineItemIcon} style={{ background: `${color}15`, color }}>
                            <IconCreditCard size={20} />
                        </div>
                        <div className={styles.lineItemDetails}>
                            <strong>{plan.name}</strong>
                            <span className={styles.lineItemDesc}>
                                {selectedCycle === 'annual' ? 'Plano Anual' : 'Plano Mensal'}
                            </span>
                        </div>
                        <div className={styles.lineItemPrice}>
                            {formatCurrency(price)}
                        </div>
                    </div>

                    {/* Cycle toggle */}
                    {plan.price_yearly > 0 && (
                        <div className={styles.cycleToggle}>
                            <span
                                className={`${styles.cycleLabel} ${selectedCycle === 'monthly' ? styles.cycleLabelActive : styles.cycleLabelInactive}`}
                                onClick={() => setSelectedCycle('monthly')}
                            >Mensal</span>
                            <div
                                className={styles.cycleSwitch}
                                style={{ background: selectedCycle === 'annual' ? `linear-gradient(135deg, ${color}, ${color}dd)` : '#d1d5db' }}
                                onClick={() => setSelectedCycle(s => s === 'monthly' ? 'annual' : 'monthly')}
                            >
                                <div className={styles.cycleSwitchDot} style={{ left: selectedCycle === 'annual' ? 23 : 3 }} />
                            </div>
                            <span
                                className={`${styles.cycleLabel} ${selectedCycle === 'annual' ? styles.cycleLabelActive : styles.cycleLabelInactive}`}
                                onClick={() => setSelectedCycle('annual')}
                            >Anual</span>
                            {selectedCycle === 'annual' && plan.discount_yearly_percent > 0 && (
                                <span className={styles.discountBadge}>{plan.discount_yearly_percent}% OFF</span>
                            )}
                        </div>
                    )}

                    {import.meta.env.DEV && (
                        <div className={styles.sandboxBadge}>
                            🧪 Ambiente Sandbox
                        </div>
                    )}
                </div>

                {/* Right — Payment */}
                <div className={styles.payment}>
                    <h2>Forma de pagamento</h2>

                    {/* Tabs */}
                    <div className={styles.paymentTabs}>
                        <button
                            className={`${styles.paymentTab} ${paymentMethod === 'CREDIT_CARD' ? styles.paymentTabActive : ''}`}
                            onClick={() => setPaymentMethod('CREDIT_CARD')}
                        >
                            <IconCreditCard size={16} /> Cartão de Crédito
                        </button>
                        <button
                            className={`${styles.paymentTab} ${paymentMethod === 'PIX' ? styles.paymentTabActive : ''}`}
                            onClick={() => setPaymentMethod('PIX')}
                        >
                            <IconQrcode size={16} /> PIX
                            <span className={styles.tabBadge}>INSTANTÂNEO</span>
                        </button>
                    </div>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    {/* PIX Success */}
                    {pixData ? (
                        <div className={styles.pixContainer}>
                            <h3>Escaneie o QR Code</h3>
                            <img src={pixData.qrCode} alt="QR Code PIX" />
                            <p style={{ fontSize: '0.85rem', color: '#868e96' }}>
                                {pollingPayment ? 'Aguardando confirmação do pagamento...' : 'QR Code gerado'}
                            </p>
                            <button className={styles.pixCopyBtn} onClick={() => navigator.clipboard.writeText(pixData.copyPaste)}>
                                <IconCopy size={14} /> Copiar código PIX
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Card form */}
                            {paymentMethod === 'CREDIT_CARD' && (
                                <>
                                    <div className={styles.formGroup}>
                                        <label>Número do cartão</label>
                                        <div className={styles.inputWrapper}>
                                            <IconCreditCard size={16} className={styles.inputIcon} />
                                            <input
                                                type="text"
                                                value={cardNumber}
                                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                                placeholder="0000 0000 0000 0000"
                                                maxLength={19}
                                                className={cardError ? 'error' : ''}
                                            />
                                            {cardBrand !== 'unknown' && (
                                                <div className={styles.cardBrand} style={{ display: 'flex', alignItems: 'center' }}>
                                                    <CardBrandIcon brand={cardBrand} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Nome no cartão</label>
                                        <div className={styles.inputWrapper}>
                                            <IconUser size={16} className={styles.inputIcon} />
                                            <input
                                                type="text"
                                                value={cardName}
                                                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                                placeholder="NOME COMO NO CARTÃO"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label>Validade</label>
                                            <div className={styles.inputWrapper}>
                                                <IconCalendar size={16} className={styles.inputIcon} />
                                                <input
                                                    type="text"
                                                    value={cardExpiry}
                                                    onChange={(e) => handleExpiryChange(e.target.value)}
                                                    placeholder="MM/AA"
                                                    maxLength={5}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>CVV</label>
                                            <div className={styles.inputWrapper}>
                                                <IconLock size={16} className={styles.inputIcon} />
                                                <input
                                                    type="text"
                                                    value={cardCvv}
                                                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    placeholder="000"
                                                    maxLength={4}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {cardError && <span className={styles.errorText}>{cardError}</span>}
                                </>
                            )}

                            {/* Documento e Telefone */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>CPF ou CNPJ</label>
                                    <div className={styles.inputWrapper}>
                                        <IconUser size={16} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={cpfCnpj}
                                            onChange={(e) => handleCpfChange(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className={cpfError ? 'error' : ''}
                                        />
                                    </div>
                                    {cpfError && <span className={styles.errorText}>{cpfError}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Contato (Telefone com DDD)</label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                            className={phoneError ? 'error' : ''}
                                            style={{ paddingLeft: 12 }}
                                        />
                                    </div>
                                    {phoneError && <span className={styles.errorText}>{phoneError}</span>}
                                </div>
                            </div>

                            {/* Address (card only) */}
                            {paymentMethod === 'CREDIT_CARD' && (
                                <div style={{ marginTop: 8 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#495057' }}>Endereço de cobrança</label>
                                    <div className={styles.formGroup} style={{ marginTop: 6 }}>
                                        <div className={styles.inputWrapper}>
                                            <IconMapPin size={16} className={styles.inputIcon} />
                                            <input
                                                type="text"
                                                value={cep}
                                                onChange={(e) => handleCepChange(e.target.value)}
                                                onFocus={() => setShowAddress(true)}
                                                placeholder="00000-000 ou preencha abaixo"
                                                maxLength={9}
                                                className={cepError ? 'error' : ''}
                                            />
                                            {loadingCep && <Loader size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />}
                                        </div>
                                        {cepError && <span className={styles.errorText}>{cepError}</span>}
                                    </div>

                                    {showAddress && (
                                        <div className={styles.addressFields}>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Logradouro</label>
                                                    <div className={styles.inputWrapper}>
                                                        <IconMapPin size={16} className={styles.inputIcon} />
                                                        <input type="text" value={addressData.logradouro} onChange={(e) => setAddressData(d => ({ ...d, logradouro: e.target.value }))} placeholder="Rua, Av..." />
                                                    </div>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Número</label>
                                                    <div className={styles.inputWrapper}>
                                                        <IconMapPin size={16} className={styles.inputIcon} />
                                                        <input type="text" value={addressData.numero} onChange={(e) => setAddressData(d => ({ ...d, numero: e.target.value }))} placeholder="Nº" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Cidade</label>
                                                    <div className={styles.inputWrapper}>
                                                        <IconMapPin size={16} className={styles.inputIcon} />
                                                        <input type="text" value={addressData.cidade} onChange={(e) => setAddressData(d => ({ ...d, cidade: e.target.value }))} readOnly={!!addressData.cidade} />
                                                    </div>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>UF</label>
                                                    <div className={styles.inputWrapper}>
                                                        <IconMapPin size={16} className={styles.inputIcon} />
                                                        <input type="text" value={addressData.estado} onChange={(e) => setAddressData(d => ({ ...d, estado: e.target.value }))} maxLength={2} readOnly={!!addressData.estado} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                className={styles.btnSubmit}
                                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader size={18} color="white" />
                                ) : (
                                    <>
                                        <IconLock size={16} />
                                        Pagar {formatCurrency(price)}
                                    </>
                                )}
                            </button>

                            <p className={styles.termsText}>
                                Ao continuar, você concorda com os <a href="/termos" target="_blank">Termos de Serviço</a>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
