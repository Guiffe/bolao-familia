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
    'Arábia Saudita': 'sa', 'Uruguai': 'uy', 'Irã': 'ir', 'Nova Zelândia': 'nz'
  };
  return mapeamento[nomeTime.trim()] || 'un';
};

export function PainelJogos({ usuario, jogosGlobais, palpitesGlobais, usuariosGlobais, onPalpiteSalvo }: PainelJogosProps) {
  const [palpites, setPalpites] = useState<Record<number, { a: string, b: string }>>({});
  const [filtro, setFiltro] = useState<'proximos' | 'andamento' | 'encerrados'>('proximos');

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
  
  const jogosFiltrados = jogosGlobais.filter(jogo => {
    const dataJogo = new Date(jogo.data_hora);
    
    const jaComecou = agora >= dataJogo;
    const jaFoiFechado = jogo.status === 'Fechado';

    if (filtro === 'proximos') return !jaComecou && !jaFoiFechado;
    if (filtro === 'andamento') return jaComecou && !jaFoiFechado;
    return jaFoiFechado;
  });

  return (
    <div style={{ paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', justifyContent: 'center' }}>
        <button 
          onClick={() => setFiltro('proximos')}
          style={{ 
            flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
            backgroundColor: filtro === 'proximos' ? '#009c3b' : '#e0e0e0', 
            color: filtro === 'proximos' ? '#fff' : '#666'
          }}>
          Próximos
        </button>
        <button 
          onClick={() => setFiltro('andamento')}
          style={{ 
            flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
            backgroundColor: filtro === 'andamento' ? '#ffdf00' : '#e0e0e0', 
            color: filtro === 'andamento' ? '#002776' : '#666'
          }}>
          ⚡ Em Jogo
        </button>
        <button 
          onClick={() => setFiltro('encerrados')}
          style={{ 
            flex: 1, padding: '8px 10px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
            backgroundColor: filtro === 'encerrados' ? '#888' : '#e0e0e0', 
            color: filtro === 'encerrados' ? '#fff' : '#666'
          }}>
          Encerrados
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {jogosFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px', fontSize: '14px', fontStyle: 'italic' }}>
            Nenhum jogo nesta categoria no momento.
          </p>
        ) : (
          jogosFiltrados.map(jogo => {
            const dataJogo = new Date(jogo.data_hora);
            const dataFormatada = dataJogo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const horaFormatada = dataJogo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const jaComecou = agora >= dataJogo;
            const jaFoiFechado = jogo.status === 'Fechado';
            const jogoBloqueado = jaFoiFechado || jaComecou;

            // A LINHA CORRIGIDA SEM O TEMPLATES AQUI 👇
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
                  
                  {!jogoBloqueado && (
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                      ⏳ Faltam {Math.floor((dataJogo.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))} dias
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#777', textAlign: 'center', fontWeight: 'bold' }}>
                  GRUPO {jogo.grupo} • {dataFormatada} às {horaFormatada}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#222', textAlign: 'right' }}>{jogo.time_a}</span>
                    <img src={`https://flagcdn.com/w40/${obterCodigoBandeira(jogo.time_a)}.png`} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                  </div>
                  
                  <input type="number" min="0" placeholder="-" value={palpiteAtual.a} onChange={(e) => handleMudarPlacar(jogo.id, 'a', e.target.value)} disabled={jogoBloqueado}
                    style={{ width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', backgroundColor: jogoBloqueado ? '#e9ecef' : '#f9f9f9', color: jogoBloqueado ? '#6c757d' : '#1a1a1a' }} />
                  
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#999' }}>X</span>
                  
                  <input type="number" min="0" placeholder="-" value={palpiteAtual.b} onChange={(e) => handleMudarPlacar(jogo.id, 'b', e.target.value)} disabled={jogoBloqueado}
                    style={{ width: '40px', height: '40px', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', backgroundColor: jogoBloqueado ? '#e9ecef' : '#f9f9f9', color: jogoBloqueado ? '#6c757d' : '#1a1a1a' }} />
                  
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
                  <button 
                    onClick={() => handleSalvarPalpite(jogo.id)}
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