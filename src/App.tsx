import { useState, useEffect } from 'react';
import { Login } from './components/Login';
import type { Usuario, Jogo, Palpite } from './types';
import { PainelJogos } from './components/PainelJogos';
import { Ranking } from './components/Ranking';
import { supabase } from './lib/supabase';

function App() {

  const obterPesoFase = (grupo: string) => {
  const fase = grupo.trim().toLowerCase();
  if (fase === '16-avos') return 2;
  if (fase === 'oitavas') return 3;
  if (fase === 'quartas') return 4;
  if (fase === 'semifinal') return 5;
  if (fase.includes('final') || fase === 'terceiro') return 10;
  return 1;
  };

  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'jogos' | 'ranking'>('jogos');
  
  // Estados globais de dados
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // Estados do Dashboard do Usuário
  const [posicao, setPosicao] = useState<number>(0);
  const [totalTrofeus, setTotalTrofeus] = useState<number>(0);
  const [palpitesFeitosCount, setPalpitesFeitosCount] = useState<number>(0);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('bolao_usuario');
    if (usuarioSalvo) {
      setUsuarioAtual(JSON.parse(usuarioSalvo));
    }
  }, []);

  // Toda vez que o usuário logar ou os dados mudarem, recalculamos o Dashboard
  useEffect(() => {
    if (usuarioAtual) {
      carregarDadosGlobais();
    }
  }, [usuarioAtual]);

  const carregarDadosGlobais = async () => {
    setLoadingGlobal(true);
    
    // Busca tudo do banco em paralelo para ficar super rápido
    const [resJogos, resPalpites, resUsuarios] = await Promise.all([
      supabase.from('jogos').select('*').order('data_hora', { ascending: true }),
      supabase.from('palpites').select('*'),
      supabase.from('usuarios').select('*')
    ]);

    const listaJogos = (resJogos.data || []) as Jogo[];
    const listaPalpites = (resPalpites.data || []) as Palpite[];
    const listaUsuarios = (resUsuarios.data || []) as Usuario[];

    setJogos(listaJogos);
    setPalpites(listaPalpites);
    setUsuarios(listaUsuarios);

    // Se o usuário atual estiver logado, calcula as estatísticas dele para o painel
    if (usuarioAtual) {
      // 1. Contador de palpites feitos
      const meusPalpites = listaPalpites.filter(p => p.usuario_id === usuarioAtual.id);
      setPalpitesFeitosCount(meusPalpites.length);

      // 2. Cálculo de Ranking e Troféus de todo mundo para achar a posição
      const jogosFinalizados = listaJogos.filter(j => j.gols_a_real !== null && j.gols_b_real !== null);
      const jogosMap = new Map(jogosFinalizados.map(j => [j.id, j]));

      const rankingCalculado = listaUsuarios.map(u => {
      let trofeus = 0;
      const palpitesDoUsuario = listaPalpites.filter(p => p.usuario_id === u.id);

      palpitesDoUsuario.forEach(p => {
        const jogo = jogosMap.get(p.jogo_id);
        if (jogo) {
          // 1. Pega o peso da fase do jogo
          const peso = obterPesoFase(jogo.grupo); 
          
          const acertouTendencia = Math.sign(p.palpite_a - p.palpite_b) === Math.sign(jogo.gols_a_real! - jogo.gols_b_real!);
          
          if (acertouTendencia) {
            // 2. Multiplica os pontos pelo peso da fase
            trofeus += 1 * peso; 
            
            if (p.palpite_a === jogo.gols_a_real && p.palpite_b === jogo.gols_b_real) {
              // 3. Multiplica o bônus do placar exato também
              trofeus += 1 * peso; 
            }
          }
        }
      });

      return { id: u.id, trofeus };
    });

      // Ordena o ranking para descobrir as posições
      rankingCalculado.sort((a, b) => b.trofeus - a.trofeus);

      // Encontra os dados do usuário logado no ranking
      const indexNoRank = rankingCalculado.findIndex(r => r.id === usuarioAtual.id);
      const meusTrofeusCalculados = rankingCalculado[indexNoRank]?.trofeus || 0;

      setPosicao(indexNoRank !== -1 ? indexNoRank + 1 : listaUsuarios.length);
      setTotalTrofeus(meusTrofeusCalculados);
    }

    setLoadingGlobal(false);
  };

  const handleLogin = (usuario: Usuario) => {
    setUsuarioAtual(usuario);
    localStorage.setItem('bolao_usuario', JSON.stringify(usuario));
  };

  const handleSair = () => {
    setUsuarioAtual(null);
    localStorage.removeItem('bolao_usuario');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f1', color: '#333' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif' }}>
        
        {!usuarioAtual ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            {/* Cabeçalho */}
            <header style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              marginBottom: '15px', backgroundColor: '#009c3b', padding: '12px 15px', 
              borderRadius: '12px', color: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' 
            }}>
              <h2 style={{ margin: 0, fontSize: '16px' }}>Olá, {usuarioAtual.nome}! ⚽</h2>
              <button onClick={handleSair} style={{ 
                padding: '6px 12px', cursor: 'pointer', backgroundColor: '#ffdf00', 
                color: '#002776', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px'
              }}>
                Sair
              </button>
            </header>

            {/* ITEM 1: Painel de Resumo no Topo (Dashboard) */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' 
            }}>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Sua Posição</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#002776', marginTop: '4px' }}>
                  {loadingGlobal ? '...' : `#${posicao}`}
                </div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Palpites</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
                  {loadingGlobal ? '...' : `${palpitesFeitosCount} / ${jogos.length}`}
                </div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase' }}>Troféus</span>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e6b800', marginTop: '4px' }}>
                  {loadingGlobal ? '...' : `${totalTrofeus} 🏆`}
                </div>
              </div>
            </div>
            
            {/* Menu de Navegação */}
            <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => setAbaAtiva('jogos')}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: abaAtiva === 'jogos' ? '#002776' : '#e0e0e0', 
                  color: abaAtiva === 'jogos' ? '#fff' : '#666',
                }}>
                ⚽ Jogos
              </button>
              <button 
                onClick={() => setAbaAtiva('ranking')}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: abaAtiva === 'ranking' ? '#002776' : '#e0e0e0', 
                  color: abaAtiva === 'ranking' ? '#fff' : '#666',
                }}>
                🏆 Ranking
              </button>
            </nav>

            {/* Área Principal */}
            <main>
              {loadingGlobal ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Atualizando dados...</p>
              ) : abaAtiva === 'jogos' ? (
                <PainelJogos 
                  usuario={usuarioAtual} 
                  jogosGlobais={jogos} 
                  palpitesGlobais={palpites}
                  usuariosGlobais={usuarios}
                  onPalpiteSalvo={carregarDadosGlobais} 
                />
              ) : (
                <Ranking jogosGlobais={jogos} palpitesGlobais={palpites} usuariosGlobais={usuarios} />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default App;