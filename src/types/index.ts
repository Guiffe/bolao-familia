// src/types/index.ts

export interface Usuario {
  id: string;
  nome: string;
  criado_em?: string; // Opcional porque o Supabase gera automaticamente
  total_trofeus?: number; // Podemos calcular e injetar esse valor no frontend depois
}

export interface Jogo {
  id: number;
  grupo: string;
  time_a: string;
  time_b: string;
  data_hora: string;
  gols_a_real: number | null; // Null porque o jogo pode ainda não ter acontecido
  gols_b_real: number | null;
  status: 'Aberto' | 'Fechado';
}

export interface Palpite {
  id: string;
  usuario_id: string;
  jogo_id: number;
  palpite_a: number;
  palpite_b: number;
  trofeus_ganhos: number;
}