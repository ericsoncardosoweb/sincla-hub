/**
 * ViaCEP Service — Auto-fill de endereço por CEP
 */

export interface AddressData {
    postalCode: string;
    address: string;
    complement: string;
    province: string;
    city: string;
    state: string;
}

/**
 * Busca endereço pelo CEP usando a API ViaCEP
 */
export async function getAddressByCep(cep: string): Promise<AddressData | null> {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await response.json();

        if (data.erro) return null;

        return {
            postalCode: formatCep(clean),
            address: data.logradouro || '',
            complement: data.complemento || '',
            province: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
        };
    } catch {
        return null;
    }
}

/**
 * Formata CEP: 01310-100
 */
export function formatCep(cep: string): string {
    const clean = cep.replace(/\D/g, '');
    if (clean.length > 5) {
        return clean.slice(0, 5) + '-' + clean.slice(5, 8);
    }
    return clean;
}

/**
 * Lista de estados brasileiros
 */
export const BRAZILIAN_STATES = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
];
