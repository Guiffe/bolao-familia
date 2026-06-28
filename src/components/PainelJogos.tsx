import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Jogo, Usuario, Palpite } from '../types';

interface PainelJogosProps {
  usuario: Usuario;
  jogosGlobais: Jogo[];
  palpitesGlobais: Palpite[];
  usuariosGlobais: Usuario[];
  onPalpiteSalvo: () => void;
}

const obterCodigoBandeira = (nomeTime: string) => {
  const mapeamento: Record<string, string> = {
    'México': 'mx', 'África do Sul': 'za', 'Coreia do Sul': 'kr', 'República Tcheca': 'cz',
    'Canadá': 'ca', 'Bósnia e Herzegovina': 'ba', 'Estados Unidos': 'us', 'Paraguai': 'py',
    'Catar': 'qa', 'Suíça': 'ch', 'Brasil': 'br', 'Marrocos': 'ma', 'Haiti': 'ht',
    'Escócia': 'gb-sct', 'Austrália': 'au', 'Turquia': 'tr', 'Alemanha': 'de', 'Curaçao': 'cw',
    'Holanda': 'nl', 'Japão': 'jp', 'Costa do Marfim': 'ci', 'Equador': 'ec', 'Suécia': 'se',
    'Tunísia': 'tn', 'Espanha': 'es', 'Cabo Verde': 'cv', 'Bélgica': 'be', 'Egito': 'eg',
    'Arábia Saudita': 'sa', 'Uruguai': 'uy', 'Irã': 'ir', 'Nova Zelândia': 'nz',
    'França': 'fr', 'Senegal': 'sn', 'Iraque': 'iq', 'Noruega': 'no',
    'Argentina': 'ar', 'Argélia': 'dz', 'Áustria': 'at', 'Jordânia': 'jo',
    'Portugal': 'pt', 'República Democrática do Congo': 'cd', 'Uzbequistão': 'uz', 'Colômbia': 'co',
    'Inglaterra': 'gb-eng', 'Croácia': 'hr', 'Gana': 'gh', 'Panamá': 'pa'
  };
  return mapeamento[nomeTime.trim()] || 'un';
};

export function PainelJogos({ usuario, jogosGlobais, palpitesGlobais, usuariosGlobais, onPalpiteSalvo }: PainelJogosProps) {
  const [palpites, setPalpites] = useState<Record<number, { a: string, b: string }>>({});
  const [filtro, setFiltro] = useState<'proximos' | 'andamento' | 'encerrados'>('proximos');
  const [dataSelecionada, setDataSelecionada] = useState<string>('');

  useEffect(() => {
    const meusPalpites = palpitesGlobais.filter(p => p.usuario_id === usuario.id);
    const palpitesSalvos: Record<number, { a: string, b: string }> = {};
    
    meusPalpites.forEach(p => {
      palpitesSalvos[p.jogo_id] = { a: String(p.palpite_a), b: String(p.palpite_b) };
    });
    setPalpites(palpitesSalvos);
  }, [palpitesGlobais, usuario.id]);

  const handleMudarPlacar = (jogoId: number, time: 'a' | 'b', valor: string) => {
    setPalpites(prev => ({ ...prev, [jogoId]: { ...prev[jogoId], [time]: valor } }));
  };

  const handleSalvarPalpite = async (jogoId: number) => {
    const palpite = palpites[jogoId];
    if (!palpite || palpite.a === '' || palpite.b === '') {
      alert('⚠️ Preencha os gols de ambos os times antes de salvar!');
      return;
    }

    const { error } = await supabase
      .from('palpites')
      .upsert({
        usuario_id: usuario.id, jogo_id: jogoId,
        palpite_a: parseInt(palpite.a), palpite_b: parseInt(palpite.b)
      }, { onConflict: 'usuario_id, jogo_id' }); 

    if (error) {
      console.error(error);
      alert('❌ Erro ao salvar o palpite. Tente novamente.');
    } else {
      alert('✅ Palpite gravado com sucesso! 🏆');
      onPalpiteSalvo(); 
    }
  };

  const agora = new Date();
  
  const jogosPorStatus = jogosGlobais.filter(jogo => {
    const dataJogo = new Date(jogo.data_hora);
    const jaComecou = agora >= dataJogo;
    const jaFoiFechado = jogo.status === 'Fechado';

    if (filtro === 'proximos') return !jaComecou && !jaFoiFechado;
    if (filtro === 'andamento') return jaComecou && !jaFoiFechado;
    return jaFoiFechado;
  });

  const datasDisponiveis = Array.from(new Set(jogosPorStatus.map(jogo => {
    const d = new Date(jogo.data_hora);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })));

  datasDisponiveis.sort((a, b) => {
    if (filtro === 'encerrados') return new Date(b).getTime() - new Date(a).getTime();
    return new Date(a).getTime() - new Date(b).getTime();
  });

  useEffect(() => {
    if (datasDisponiveis.length > 0 && !datasDisponiveis.includes(dataSelecionada)) {
      setDataSelecionada(datasDisponiveis[0]);
    } else if (datasDisponiveis.length === 0) {
      setDataSelecionada('');
    }
  }, [filtro, jogosGlobais]); // eslint-disable-line react-hooks/exhaustive-deps

  const jogosParaRenderizar = jogosPorStatus.filter(jogo => {
    const d = new Date(jogo.data_hora);
    const dataFormatada = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dataFormatada === dataSelecionada;
  });

  const renderizarNomeData = (dataStr: string) => {
    if (!dataStr) return '';
    const [, mes, dia] = dataStr.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${dia} de ${meses[Number(mes) - 1]}`;
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', justifyContent: 'center' }}>
        <button onClick={() => setFiltro('proximos')}
          style={{ flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
          backgroundColor: filtro === 'proximos' ? '#009c3b' : '#e0e0e0', color: filtro === 'proximos' ? '#fff' : '#666' }}>
          Próximos
        </button>
        <button onClick={() => setFiltro('andamento')}
          style={{ flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
          backgroundColor: filtro === 'andamento' ? '#ffdf00' : '#e0e0e0', color: filtro === 'andamento' ? '#002776' : '#666' }}>
          ⚡ Em Jogo
        </button>
        <button onClick={() => setFiltro('encerrados')}
          style={{ flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
          backgroundColor: filtro === 'encerrados' ? '#888' : '#e0e0e0', color: filtro === 'encerrados' ? '#fff' : '#666' }}>
          Encerrados
        </button>
      </div>
      
      {datasDisponiveis.length > 0 && (
        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px', marginBottom: '20px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {datasDisponiveis.map(dataStr => {
            const [ano, mes, dia] = dataStr.split('-');
            const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
            const nomeSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];
            const isSelecionado = dataSelecionada === dataStr;

            return (
              <button key={dataStr} onClick={() => setDataSelecionada(dataStr)}
                style={{
                  flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  width: '60px', height: '70px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                  border: isSelecionado ? '2px solid #009c3b' : '1px solid #ddd',
                  backgroundColor: isSelecionado ? '#e8f5e9' : '#ffffff',
                  boxShadow: isSelecionado ? '0 2px 5px rgba(0,156,59,0.2)' : 'none'
                }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isSelecionado ? '#009c3b' : '#888' }}>{nomeSemana}</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: isSelecionado ? '#002776' : '#333' }}>{dia}</span>
              </button>
            );
          })}
        </div>
      )}

      {dataSelecionada && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
          <h4 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            📅 {renderizarNomeData(dataSelecionada)}
          </h4>
          <span style={{ backgroundColor: '#e9ecef', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#6c757d' }}>
            {jogosParaRenderizar.length} {jogosParaRenderizar.length === 1 ? 'jogo' : 'jogos'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {jogosParaRenderizar.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px', fontSize: '14px', fontStyle: 'italic' }}>
            Nenhum jogo nesta categoria no momento.
          </p>
        ) : (
          jogosParaRenderizar.map(jogo => {
            const dataJogo = new Date(jogo.data_hora);
            const horaFormatada = dataJogo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const jaComecou = agora >= dataJogo;
            const jaFoiFechado = jogo.status === 'Fechado';
            const jogoBloqueado = jaFoiFechado || jaComecou;

            const palpiteAtual = palpites[jogo.id] || { a: '', b: '' };
            const jaTemPalpiteSalvo = palpitesGlobais.some(p => p.usuario_id === usuario.id && p.jogo_id === jogo.id);
            const palpitesDesteJogo = palpitesGlobais.filter(p => p.jogo_id === jogo.id);

            return (
              <div key={jogo.id} style={{ 
                backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                borderTop: jaFoiFechado ? '4px solid #ccc' : jaComecou ? '4px solid #ffdf00' : '4px solid #009c3b',
                opacity: jaFoiFechado ? 0.85 : 1
              }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ 
                    fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px',
                    backgroundColor: jaFoiFechado ? '#e0e0e0' : jaComecou ? '#fff9c4' : jaTemPalpiteSalvo ? '#e8f5e9' : '#fff3e0',
                    color: jaFoiFechado ? '#777' : jaComecou ? '#002776' : jaTemPalpiteSalvo ? '#2e7d32' : '#ef6c00'
                  }}>
                    {jaFoiFechado ? '🔒 Encerrado' : jaComecou ? '🔥 Rolando' : jaTemPalpiteSalvo ? '🟢 Palpitado' : '🔴 Pendente'}
                  </span>
                  
                  <span style={{ fontSize: '12px', color: '#555', fontWeight: 'bold', backgroundColor: '#f1f3f5', padding: '4px 10px', borderRadius: '6px' }}>
                    🕒 {horaFormatada}
                  </span>
                </div>

                <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#777', textAlign: 'center', fontWeight: 'bold' }}>
  {jogo.grupo.trim().length > 1 ? jogo.grupo.toUpperCase() : `GRUPO ${jogo.grupo.toUpperCase()}`}
</p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#222', textAlign: 'right' }}>{jogo.time_a}</span>
                    <img src={`https://flagcdn.com/w40/${obterCodigoBandeira(jogo.time_a)}.png`} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                  </div>
                  
                  {/* ALTERAÇÃO AQUI: Se o jogo acabou, mostra o resultado real em azul e amarelo destacado */}
                  {jaFoiFechado ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '40px', height: '40px', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', backgroundColor: '#002776', color: '#ffdf00', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                        {jogo.gols_a_real}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>X</span>
                      <span style={{ width: '40px', height: '40px', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', backgroundColor: '#002776', color: '#ffdf00', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                        {jogo.gols_b_real}
                      </span>
                    </div>
                  ) : (
                    <>
                      <input type="number" min="0" placeholder="-" value={palpiteAtual.a} onChange={(e) => handleMudarPlacar(jogo.id, 'a', e.target.value)} disabled={jogoBloqueado}
                        style={{ width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', backgroundColor: jogoBloqueado ? '#e9ecef' : '#f9f9f9', color: jogoBloqueado ? '#6c757d' : '#1a1a1a' }} />
                      
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#999' }}>X</span>
                      
                      <input type="number" min="0" placeholder="-" value={palpiteAtual.b} onChange={(e) => handleMudarPlacar(jogo.id, 'b', e.target.value)} disabled={jogoBloqueado}
                        style={{ width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', backgroundColor: jogoBloqueado ? '#e9ecef' : '#f9f9f9', color: jogoBloqueado ? '#6c757d' : '#1a1a1a' }} />
                    </>
                  )}
                  
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                    <img src={`https://flagcdn.com/w40/${obterCodigoBandeira(jogo.time_b)}.png`} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#222', textAlign: 'left' }}>{jogo.time_b}</span>
                  </div>
                </div>
                
                {jogoBloqueado ? (
                  <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#495057', textAlign: 'center' }}>
                      👀 Palpites da Família
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {palpitesDesteJogo.length > 0 ? (
                        palpitesDesteJogo.map(p => {
                          const dono = usuariosGlobais.find(u => u.id === p.usuario_id);
                          const isMe = dono?.id === usuario.id;
                          return (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #dee2e6', paddingBottom: '4px' }}>
                              <span style={{ color: isMe ? '#002776' : '#495057', fontWeight: isMe ? 'bold' : 'normal' }}>
                                {dono?.nome || 'Alguém'} {isMe && '(Você)'}
                              </span>
                              <span style={{ fontWeight: 'bold', color: '#212529' }}>
                                {p.palpite_a} x {p.palpite_b}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '13px', color: '#868e96', textAlign: 'center' }}>Ninguém palpitou neste jogo 😅</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => handleSalvarPalpite(jogo.id)}
                    style={{ marginTop: '15px', width: '100%', padding: '12px', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#009c3b', color: '#fff', cursor: 'pointer' }}>
                    Salvar Palpite
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}