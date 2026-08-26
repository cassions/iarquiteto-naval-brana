#!/usr/bin/env node
/* Expande os assets comprimidos para texto legivel, ao lado dos .gz.

   Os assets viajam comprimidos por um motivo pratico: somam 193 KB de codigo e
   modelo que sao ENTRADA PARA O SCRIPT, nao leitura para ninguem. Comprimidos,
   ninguem os abre por engano e gasta cinquenta mil tokens a toa. Quando for
   preciso mesmo mexer neles, rode:

     node scripts/expandir-assets.js

   O gerador prefere a versao expandida quando ela existe, entao dá para editar
   e rodar em seguida. Para voltar ao estado original, apague os arquivos sem
   .gz — os .gz continuam lá. */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const ASS = path.resolve(__dirname, '..', 'assets');
let n = 0;
fs.readdirSync(ASS).filter(f => f.endsWith('.gz')).forEach(f => {
  const alvo = path.join(ASS, f.slice(0, -3));
  fs.writeFileSync(alvo, zlib.gunzipSync(fs.readFileSync(path.join(ASS, f))));
  console.log('  ' + f.slice(0, -3) + '  ' + (fs.statSync(alvo).size/1024).toFixed(0) + ' KB');
  n++;
});
console.log(n + ' arquivo(s) expandido(s) em assets/');
