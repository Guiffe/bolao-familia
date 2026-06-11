import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types';

interface LoginProps {
  onLogin: (usuario: Usuario) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      setErro('Por favor, digite seu nome para entrar.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // 1. Verifica se o usuário já existe (usando ilike para ignorar maiúsculas/minúsculas)
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('nome', nome.trim())
        .single();

      // Se achou o usuário, faz o login
      if (usuarioExistente) {
        onLogin(usuarioExistente as Usuario);
      } else {
        // 2. Se não existe, cria um novo no banco de dados
        const { data: novoUsuario, error: erroInsert } = await supabase
          .from('usuarios')
          .insert([{ nome: nome.trim() }])
          .select()
          .single();

        if (erroInsert) throw erroInsert;
        if (novoUsuario) onLogin(novoUsuario as Usuario);
      }
    } catch (err: any) {
      // Ignora o erro "PGRST116" que o Supabase joga quando o .single() não encontra nada
      if (err.code !== 'PGRST116') {
        console.error(err);
        setErro('Erro ao acessar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🏆 Bolão da Família</h1>
      <p>Digite seu nome para começar a palpitar!</p>
      
      <form onSubmit={handleEntrar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Seu nome (ex: Tio João)" 
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={loading}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', fontSize: '16px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Entrando...' : 'Entrar no Bolão'}
        </button>
      </form>
      
      {erro && <p style={{ color: 'red', marginTop: '15px' }}>{erro}</p>}
    </div>
  );
}