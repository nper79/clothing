import React, { useState, useEffect } from 'react';
import { BatchImageGenerator } from '../services/batchImageGenerator';
import { ComprehensivePromptLibrary } from '../services/comprehensivePromptLibrary';

const CacheDiagnostic: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<any>({});
  const [legacyCache, setLegacyCache] = useState<any>({});
  const [diagnostic, setDiagnostic] = useState<string>('');

  useEffect(() => {
    const diagnoseCache = () => {
      try {
        // Verificar novo cache
        const newCache = {
          male: localStorage.getItem('comprehensive_generated_images_male'),
          female: localStorage.getItem('comprehensive_generated_images_female'),
          maleSize: localStorage.getItem('comprehensive_generated_images_male')?.length || 0,
          femaleSize: localStorage.getItem('comprehensive_generated_images_female')?.length || 0
        };

        // Verificar cache antigo
        const oldCache = {
          male: localStorage.getItem('generated_style_images_male'),
          female: localStorage.getItem('generated_style_images_female'),
          maleSize: localStorage.getItem('generated_style_images_male')?.length || 0,
          femaleSize: localStorage.getItem('generated_style_images_female')?.length || 0
        };

        // Estatísticas BatchImageGenerator
        const batchStats = BatchImageGenerator.getGenerationStats();

        setCacheInfo({
          new: newCache,
          old: oldCache,
          batch: batchStats
        });

        // Tentar parsear caches
        let diagnosticText = '';

        if (newCache.male) {
          try {
            const maleImages = JSON.parse(newCache.male);
            diagnosticText += `✅ Novo cache masculino: ${maleImages.length} imagens\n`;
            maleImages.slice(0, 3).forEach((img: any, i: number) => {
              diagnosticText += `  ${i+1}. ${img.name}: ${img.imageUrl ? '✅' : '❌'}\n`;
            });
          } catch (e) {
            diagnosticText += `❌ Erro ao parsear novo cache masculino\n`;
          }
        } else {
          diagnosticText += `❌ Nenhum cache masculino encontrado\n`;
        }

        if (oldCache.male) {
          try {
            const oldMaleImages = JSON.parse(oldCache.male);
            diagnosticText += `✅ Cache antigo masculino: ${oldMaleImages.length} imagens\n`;
            oldMaleImages.slice(0, 3).forEach((img: any, i: number) => {
              diagnosticText += `  ${i+1}. ${img.styleCategory}: ${img.imageUrl ? '✅' : '❌'}\n`;
            });
          } catch (e) {
            diagnosticText += `❌ Erro ao parsear cache antigo masculino\n`;
          }
        } else {
          diagnosticText += `❌ Nenhum cache antigo masculino encontrado\n`;
        }

        // Verificar biblioteca
        const libraryStats = ComprehensivePromptLibrary.getStats();
        diagnosticText += `\n📚 Biblioteca: ${libraryStats.total} looks (${libraryStats.male}M, ${libraryStats.female}F)\n`;

        setDiagnostic(diagnosticText);

      } catch (error) {
        setDiagnostic(`❌ Erro no diagnóstico: ${error}`);
      }
    };

    diagnoseCache();
  }, []);

  const clearAllCaches = () => {
    localStorage.removeItem('comprehensive_generated_images_male');
    localStorage.removeItem('comprehensive_generated_images_female');
    localStorage.removeItem('generated_style_images_male');
    localStorage.removeItem('generated_style_images_female');
    localStorage.removeItem('generated_style_images'); // Cache muito antigo
    alert('Todos os caches foram limpos!');
    window.location.reload();
  };

  const importLegacyCache = () => {
    try {
      const legacyMale = localStorage.getItem('generated_style_images_male');
      const legacyFemale = localStorage.getItem('generated_style_images_female');

      if (legacyMale) {
        const maleImages = JSON.parse(legacyMale);
        const convertedMale = maleImages.slice(0, 20).map((img: any, index: number) => ({
          id: `imported_male_${index}`,
          lookId: img.styleCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          gender: 'male',
          name: img.styleCategory,
          category: img.styleCategory,
          level: 'intermedio',
          prompt: img.prompt || '',
          imageUrl: img.imageUrl || '',
          isGenerated: !!img.imageUrl,
          error: img.imageUrl ? undefined : 'No image URL',
          generatedAt: new Date(img.generatedAt)
        }));

        localStorage.setItem('comprehensive_generated_images_male', JSON.stringify(convertedMale));
        alert(`Importadas ${convertedMale.length} imagens masculinas!`);
      }

      if (legacyFemale) {
        const femaleImages = JSON.parse(legacyFemale);
        const convertedFemale = femaleImages.slice(0, 20).map((img: any, index: number) => ({
          id: `imported_female_${index}`,
          lookId: img.styleCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          gender: 'female',
          name: img.styleCategory,
          category: img.styleCategory,
          level: 'intermedio',
          prompt: img.prompt || '',
          imageUrl: img.imageUrl || '',
          isGenerated: !!img.imageUrl,
          error: img.imageUrl ? undefined : 'No image URL',
          generatedAt: new Date(img.generatedAt)
        }));

        localStorage.setItem('comprehensive_generated_images_female', JSON.stringify(convertedFemale));
        alert(`Importadas ${convertedFemale.length} imagens femininas!`);
      }

      window.location.reload();
    } catch (error) {
      alert(`Erro ao importar: ${error}`);
    }
  };

  const testCacheAccess = () => {
    try {
      const maleImages = BatchImageGenerator.getGeneratedImages('male');
      const femaleImages = BatchImageGenerator.getGeneratedImages('female');

      alert(`Cache access:\nMasculino: ${maleImages.length} imagens\nFeminino: ${femaleImages.length} imagens`);
    } catch (error) {
      alert(`Erro ao acessar cache: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🔍 Diagnóstico de Cache</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Cache Novo */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Cache Novo (Comprehensive)</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Masculino:</span> {cacheInfo.new?.maleSize || 0} bytes
              </div>
              <div>
                <span className="font-medium">Feminino:</span> {cacheInfo.new?.femaleSize || 0} bytes
              </div>
              <div className="mt-2">
                <span className="font-medium">Batch Stats:</span>
                <ul className="ml-4 text-xs">
                  <li>Male: {cacheInfo.batch?.male || 0}</li>
                  <li>Female: {cacheInfo.batch?.female || 0}</li>
                  <li>Total: {cacheInfo.batch?.total || 0}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cache Antigo */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Cache Antigo (Legacy)</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Masculino:</span> {cacheInfo.old?.maleSize || 0} bytes
              </div>
              <div>
                <span className="font-medium">Feminino:</span> {cacheInfo.old?.femaleSize || 0} bytes
              </div>
            </div>
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Diagnóstico Detalhado</h2>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto max-h-64">
            {diagnostic}
          </pre>
        </div>

        {/* Ações */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🔧 Ações</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testCacheAccess}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Testar Cache
            </button>
            <button
              onClick={importLegacyCache}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Importar Cache Antigo
            </button>
            <button
              onClick={clearAllCaches}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Limpar Todos Caches
            </button>
            <a
              href="/test-batch"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Gerar Novas Imagens
            </a>
            <a
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Voltar ao App
            </a>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ Informação:</h3>
          <p className="text-sm text-yellow-700">
            As imagens que você gerou anteriormente devem estar no cache. Se não estiverem aparecendo no app,
            use o botão "Importar Cache Antigo" para convertê-las para o novo formato, ou "Testar Cache" para verificar
            se estão acessíveis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CacheDiagnostic;