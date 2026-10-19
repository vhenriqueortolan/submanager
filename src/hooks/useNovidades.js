import { useEffect, useState } from 'react';
import { lerNovidades } from '../lib/novidades.js';

// Lido uma vez por abertura do app e compartilhado entre as telas.
let lido; // undefined = ainda não lido; null = não foi possível ler; objeto = dados
let pedido = null;

function carregar() {
  pedido ??= lerNovidades().then((dados) => {
    lido = dados;
    return dados;
  });
  return pedido;
}

/** Dados de novidades: undefined enquanto lê, null se a leitura falhou. */
export default function useNovidades() {
  const [dados, setDados] = useState(lido);
  useEffect(() => {
    if (lido !== undefined) return;
    let ativo = true;
    carregar().then((d) => ativo && setDados(d));
    return () => {
      ativo = false;
    };
  }, []);
  return dados;
}
