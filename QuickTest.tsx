import React, { useState } from 'react';
import Replicate from "replicate";

const customFetch = async (input: string | Request | URL, options: RequestInit = {}) => {
  const inputStr = typeof input === 'string' ? input : input.toString();
  console.log('🔍 customFetch called with:', inputStr);

  if (inputStr.includes('api.replicate.com')) {
    const proxyUrl = '/api/replicate' + inputStr.replace('https://api.replicate.com', '');
    console.log('🔄 Using proxy:', inputStr, '->', proxyUrl);

    const baseHeaders = new Headers();
    baseHeaders.delete('authorization');

    // Se for FormData, não seta Content-Type - o browser define automaticamente com boundary
    if (!baseHeaders.has('content-type') && !(options.body instanceof FormData)) {
      baseHeaders.set('Content-Type', 'application/json');
    }

    return fetch(proxyUrl, {
      ...options,
      headers: baseHeaders
    });
  }

  console.log('🌐 Direct fetch to:', inputStr);
  return fetch(input as RequestInfo, options);
};

const QuickTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const generateImage = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const replicate = new Replicate({
        auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
        fetch: customFetch,
        useFileOutput: false
      });

      console.log('🚀 Iniciando geração de imagem com reve/fast...');

      // URL de imagem de teste - profissional em terno
      const testImageUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=768&fit=crop";

      const output = await replicate.run("reve/edit-fast:f0253eb7b26cc2416ad98c20492fbe4b842e09d808318fdf9e7caeffa9ae78f5", {
        input: {
          image: testImageUrl,
          prompt: "Transform into minimalist business casual outfit with clean lines and neutral colors",
          guidance_scale: 7.5,
          num_inference_steps: 50,
          strength: 0.8
        }
      });

      console.log('✅ Output recebido:', output);

      let imageUrl = '';
      if (Array.isArray(output)) {
        imageUrl = output[0] || '';
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (typeof output === 'object' && output !== null) {
        imageUrl = (output as any)?.[0] || (output as any)?.url || '';
      }

      if (imageUrl) {
        setResult(`🎉 SUCESSO! Imagem revelada: ${imageUrl}`);
        console.log('🔗 URL da imagem:', imageUrl);
      } else {
        setResult('❌ Erro: Nenhuma URL de imagem retornada');
      }

    } catch (error) {
      console.error('❌ Erro na geração:', error);
      setResult(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧪 Teste Rápido - REVE/FAST</h2>

      <button
        onClick={generateImage}
        disabled={isLoading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: isLoading ? '#ccc' : '#ff4757',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {isLoading ? '⏳ Processando com reve/fast...' : '🔥 REVELAR IMAGEM AGORA!'}
      </button>

      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: result.includes('❌') ? '#ffebee' : '#e8f5e8',
          border: `1px solid ${result.includes('❌') ? '#ffcdd2' : '#c8e6c8'}`,
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <pre>{result}</pre>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Token: {import.meta.env.VITE_REPLICATE_API_TOKEN ? '? Configured' : '? Not configured'}</p>
        <p>Model: <strong>reve-ai/reve-fast</strong> � Image editing</p>
        <p>Scenario: Transform a professional outfit into a minimal casual look</p>
      </div>
    </div>
  );
};

export default QuickTest;
