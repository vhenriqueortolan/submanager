import { useEffect, useState } from 'react';
import { Button, EmptyState } from '../design/index.jsx';
import { TEXTOS, chaveDoServico, dataLocal, estadoNovidades } from '../lib/novidades.js';
import { ehNova } from '../lib/novidades-vistas.js';

const VISIVEIS = 5;

/** Lista de itens. Existe só com itens: ao abrir, marca o serviço como visto, mas as "Nova" seguem até a pessoa sair da subaba. */
function Lista({ itens, rotulo, chave, vista, marcar }) {
  const [todas, setTodas] = useState(false);
  const [vistaAoAbrir] = useState(vista); // o que já tinha sido visto antes desta abertura
  const maisNovo = itens.reduce((max, i) => (max === null || i.data > max ? i.data : max), null);
  useEffect(() => {
    if (chave && maisNovo) marcar(chave, maisNovo);
  }, [chave, maisNovo, marcar]);
  const lista = todas ? itens : itens.slice(0, VISIVEIS);

  return (
    <>
      <p className="ds-help novidades-fonte">{rotulo}</p>
      <ul className="novidades-lista">
        {lista.map((i) => (
          <li key={i.url} className="novidade">
            <span className="novidade-titulo">{i.titulo}</span>
            <span className="novidade-rodape">
              <span className="novidade-meta">
                {ehNova(i, vistaAoAbrir) && <span className="novidade-nova">Nova</span>}
                <time className="ds-help novidade-data" dateTime={i.data}>{dataLocal(i.data)}</time>
              </span>
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
  );
}

/**
 * Subaba Novidades do espaço do serviço. `dados`: undefined enquanto lê, null se a leitura falhou.
 * `vistas` e `marcar` vêm de useNovidadesVistas. Nunca mostra preço (D-015).
 */
export default function Novidades({ dominio, dados, vistas, marcar }) {
  const { estado, itens, rotulo, paginaUrl } = estadoNovidades(dominio, dados);
  const chave = chaveDoServico(dominio, dados);

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

      {estado === 'ok' && <Lista itens={itens} rotulo={rotulo} chave={chave} vista={vistas[chave]} marcar={marcar} />}

      {paginaUrl && (
        <Button className="novidades-pagina" variant="ghost" href={paginaUrl} target="_blank" rel="noopener noreferrer">
          Abrir página do serviço
        </Button>
      )}
    </div>
  );
}
