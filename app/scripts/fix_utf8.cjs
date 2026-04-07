const fs = require('fs');
const path = require('path');

const map = {
  "Ã¡": "á", "Ã ": "à", "Ã¢": "â", "Ã£": "ã", "Ã¤": "ä",
  "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã«": "ë",
  "Ã­": "í", "Ã¬": "ì", "Ã®": "î", "Ã¯": "ï",
  "Ã³": "ó", "Ã²": "ò", "Ã´": "ô", "Ãµ": "õ", "Ã¶": "ö",
  "Ãº": "ú", "Ã¹": "ù", "Ã»": "û", "Ã¼": "ü",
  "Ã§": "ç", "Ã±": "ñ", "Ã‡": "Ç", "Ã‰": "É", "ÃŠ": "Ê",
  "Ã“": "Ó", "Ã”": "Ô", "Ã•": "Õ", "Ãš": "Ú", "Ã‚": "Â",
  "Ãƒ": "Ã", "Ã€": "À",
  "â€œ": "“", "â€\x9D": "”", "â€“": "–", "â€”": "—", "â€™": "’",
  "Ã\xAD":"í", "Ã\x8D":"Í", "A\u00A0": ""
};

function fixMojibake(text) {
  let newText = text;
  for (const [bad, good] of Object.entries(map)) {
      newText = newText.split(bad).join(good);
  }
  // Correção de Ã solto que sobrou para í (comum)
  // if (newText.includes('Ã')) {
  //   newText = newText.replace(/Ã(\w)/g, 'í$1'); // Perigoso, mas serve em último caso
  // }
  return newText;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let changedFilesCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      changedFilesCount += processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('Ã') || content.includes('â€')) {
         const newContent = fixMojibake(content);
         if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent, 'utf8');
            console.log('Corrigido:', fullPath);
            changedFilesCount++;
         }
      }
    }
  }
  return changedFilesCount;
}

const targetPath = 'C:\\www\\sincla\\tools\\rh\\src';
console.log(`Verificando e corrigindo UTF-8 em: ${targetPath}`);
const count = processDirectory(targetPath);
console.log(`\nFinalizado. ${count} arquivos corrigidos.`);
