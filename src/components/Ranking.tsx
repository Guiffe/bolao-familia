import type { Jogo, Usuario, Palpite } from '../types';

interface RankingProps {
  jogosGlobais: Jogo[];
  palpitesGlobais: Palpite[];
  usuariosGlobais: Usuario[];
}

// Define o peso/multiplicador de pontos baseado na fase escrita no banco
const obterPesoFase = (grupo: string) => {
  const fase = grupo.trim().toLowerCase();
  if (fase === '16-avos') return 2;
  if (fase === 'oitavas') return 3;
  if (fase === 'quartas') return 4;
  if (fase === 'semifinal') return 5;
  if (fase.includes('final') || fase === 'terceiro') return 10;
  return 1; // Fase de Grupos padrão (A, B, C...)
};

export function Ranking({ jogosGlobais, palpitesGlobais, usuariosGlobais }: RankingProps) {
  const jogosFinalizados = jogosGlobais.filter(j => j.gols_a_real !== null && j.gols_b_real !== null);
  const jogosMap = new Map(jogosFinalizados.map(j => [j.id, j]));

  const ranking = usuariosGlobais.map(user => {
    let trofeus = 0;
    const palpitesDoUsuario = palpitesGlobais.filter(p => p.usuario_id === user.id);

    palpitesDoUsuario.forEach(p => {
      const jogo = jogosMap.get(p.jogo_id);
      if (jogo) {
        const peso = obterPesoFase(jogo.grupo);
        
        // Valida tendência (Vencedor ou Empate)
        const acertouTendencia = Math.sign(p.palpite_a - p.palpite_b) === Math.sign(jogo.gols_a_real! - jogo.gols_b_real!);
        
        if (acertouTendencia) {
          trofeus += 1 * peso; // Pontos por acertar o vencedor/empate
          
          // Se cravou o placar exato
          if (p.palpite_a === jogo.gols_a_real && p.palpite_b === jogo.gols_b_real) {
            trofeus += 1 * peso; // Pontos extras pelo placar em cheio
          }
        }
      }
    });

    return { nome: user.nome, trofeus };
  });

  ranking.sort((a, b) => b.trofeus - a.trofeus);

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h3 style={{ textAlign: 'center', color: '#002776', marginBottom: '20px', fontSize: '22px' }}>
        Ranking da Família 🏆
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ranking.map((item, index) => (
          <div key={index} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: index === 0 ? '#fff9c4' : '#ffffff',
            padding: '15px', borderRadius: '12px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: index === 0 ? '2px solid #ffdf00' : '1px solid #eaeaea'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: index === 0 ? '#d4af37' : '#888' }}>
                {index + 1}º
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                {item.nome}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {item.trofeus > 0 ? (
                <>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#002776' }}>
                    {item.trofeus}
                  </span>
                  <span style={{ fontSize: '18px' }}>🏆</span>
                </>
              ) : (
                <span style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>
                  Zerado 😅
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}