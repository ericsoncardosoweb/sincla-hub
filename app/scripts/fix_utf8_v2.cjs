const fs = require('fs');
const path = require('path');

// This map captures precisely how ISO-8859-1 bytes encoded by mistake into UTF-8 look like for Brazilian Portuguese
const mojibakeMap = {
    "Ã¡": "á", "Ã\u00A0": "à", "Ã¢": "â", "Ã£": "ã",
    "Ã©": "é", "Ã¨": "è", "Ãª": "ê",
    "Ã\u00AD": "í", "Ã\u00AC": "ì", "Ã®": "î", // í is C3 AD
    "Ã³": "ó", "Ã²": "ò", "Ã´": "ô", "Ãµ": "õ",
    "Ãº": "ú", "Ã¹": "ù", "Ã»": "û",
    "Ã§": "ç", "Ã±": "ñ",

    "Ã\u0081": "Á", "Ã\u0080": "À", "Ã\u0082": "Â", "Ã\u0083": "Ã",
    "Ã\u0089": "É", "Ã\u0088": "È", "Ã\u008A": "Ê",
    "Ã\u008D": "Í", "Ã\u008C": "Ì", "Ã\u008E": "Î", // Í is C3 8D
    "Ã\u0093": "Ó", "Ã\u0092": "Ò", "Ã\u0094": "Ô", "Ã\u0095": "Õ",
    "Ã\u009A": "Ú", "Ã\u0099": "Ù", "Ã\u009B": "Û",
    "Ã\u0087": "Ç", "Ã\u0091": "Ñ",
    
    // Windows 1252 quotes mapping corrupted into UTF-8
    "â€œ": "“", "â€\u009D": "”", "â€“": "–", "â€”": "—", "â€™": "’",
    "â€": "”"
};

function fixText(text) {
    let result = text;
    for (const [bad, good] of Object.entries(mojibakeMap)) {
        // use split join for global replacement
        result = result.split(bad).join(good);
    }
    
    // As a final pass, sometimes 'Ã' represents 'í' or 'Í' alone due to stripping in terminal editors. 
    // We only touch them if they look obviously wrong in common Portuguese words (gestao, voce, avanca):
    result = result.replace(/GestÃo/g, 'Gestão')
                   .replace(/VocÃ/g, 'Você')
                   .replace(/AvanÃ§/g, 'Avanç')
                   .replace(/AÃ§Ã£o/g, 'Ação')
                   .replace(/OpÃ§/g, 'Opç')
                   .replace(/ConcluÃ/g, 'Concluí');
                   
    return result;
}

function processDir(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            count += processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json')) {
            const originalContent = fs.readFileSync(fullPath, 'utf8');
            
            // Fast check if it needs parsing
            if (originalContent.includes('Ã') || originalContent.includes('â€')) {
                const fixedContent = fixText(originalContent);
                if (fixedContent !== originalContent) {
                    fs.writeFileSync(fullPath, fixedContent, 'utf8');
                    console.log(`Corrigido [Mojibake]: ${fullPath}`);
                    count++;
                }
            }
        }
    }
    return count;
}

const targetBasePath = 'C:\\www\\sincla\\tools\\rh\\src';
console.log(`\nIniciando Varredura e Correção Severa em: ${targetBasePath} ...`);
const total = processDir(targetBasePath);
console.log(`Sucesso. ${total} arquivos reescritos p/ UTF-8.\n`);
