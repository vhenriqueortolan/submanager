import { useState } from 'react';
import { Button, EmptyState } from '../design/index.jsx';
import { TEXTOS, dataLocal, estadoNovidades } from '../lib/novidades.js';

const VISIVEIS = 5;

/** Subaba Novidades do espaço do serviço. `dados`: undefined enquanto lê, null se a leitura falhou. Nunca mostra preço (D-015). */
export default function Novidades({ dominio, dados }) {
  const [todas, setTodas] = useState(false);
  const { estado, itens, rotulo, paginaUrl } = estadoNovidades(dominio, dados);
  const lista = todas ? itens : itens.slice(0, VISIVEIS);

  return (
    <div id="novidades">
      {estado === 'carregando' && <p className="ds-help" role="status">Carregando novidades…</p>}

      {estado === 'sem-feed' && <EmptyState title={TEXTOS.semFeedTitulo}>{TEXTOS.semFeedTexto}</EmptyState>}

      {estado === 'erro' && <p className="novidades-aviso" role="status">{TEXTOS.erro}</p>}

      {estado === 'vazio' && (
        <>
          <p className="ds-help novidades-fonte">{rotulo}</p>
          <p className="novidades-aviso">{TEXTOS.semItens}</p>
        </>
      )}

      {estado === 'ok' && (
        <>
          <p className="ds-help novidades-fonte">{rotulo}</p>
          <ul className="novidades-lista">
            {lista.map((i) => (
              <li key={i.url} className="novidade">
                <span className="novidade-titulo">{i.titulo}</span>
                <span className="novidade-rodape">
                  <time className="ds-help novidade-data" dateTime={i.data}>{dataLocal(i.data)}</time>
                  <Button variant="secondary" size="sm" href={i.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir novidade: ${i.titulo}`}>
                    Abrir novidade
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          {itens.length > VISIVEIS && (
            <Button variant="secondary" aria-expanded={todas} onClick={() => setTodas((v) => !v)}>
              {todas ? 'Mostrar menos' : `Mostrar todas (${itens.length})`}
            </Button>
          )}
        </>
      )}

      {paginaUrl && (
        <Button className="novidades-pagina" variant="ghost" href={paginaUrl} target="_blank" rel="noopener noreferrer">
          Abrir página do serviço
        </Button>
      )}
    </div>
  );
}
