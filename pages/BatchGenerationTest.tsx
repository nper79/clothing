import React, { useState, useEffect } from 'react';
import { BatchImageGenerator, BatchGenerationProgress } from '../services/batchImageGenerator';
import { ComprehensivePromptLibrary } from '../services/comprehensivePromptLibrary';

const BatchGenerationTest: React.FC = () => {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BatchGenerationProgress | null>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const generationStats = BatchImageGenerator.getGenerationStats();
    const libraryStats = BatchImageGenerator.getLibraryStats();
    setStats({ generation: generationStats, library: libraryStats });
  };

  const startBatchGeneration = async () => {
    try {
      setIsGenerating(true);
      setProgress(null);
      setGeneratedImages([]);

      console.log(`🚀 Starting batch generation for ${selectedGender}`);

      const images = await BatchImageGenerator.generateAllGenderImages(
        selectedGender,
        (progress: BatchGenerationProgress) => {
          setProgress(progress);
        }
      );

      setGeneratedImages(images);
      loadStats();
      console.log(`✅ Generation completed: ${images.length} images generated`);

    } catch (error) {
      console.error('❌ Batch generation failed:', error);
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const clearCache = () => {
    BatchImageGenerator.clearCache();
    setGeneratedImages([]);
    loadStats();
    console.log('🗑️ Cache cleared');
  };

  const forceRegeneration = async () => {
    try {
      setIsGenerating(true);
      setProgress(null);

      await BatchImageGenerator.forceRegeneration(selectedGender, (progress) => {
        setProgress(progress);
      });

      loadStats();
    } catch (error) {
      console.error('❌ Force regeneration failed:', error);
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const getLibraryInfo = () => {
    const maleLooks = ComprehensivePromptLibrary.getAllLooks('male');
    const femaleLooks = ComprehensivePromptLibrary.getAllLooks('female');

    return {
      male: maleLooks.length,
      female: femaleLooks.length,
      total: maleLooks.length + femaleLooks.length,
      levels: {
        conservador: maleLooks.filter(l => l.level === 'conservador').length + femaleLooks.filter(l => l.level === 'conservador').length,
        intermedio: maleLooks.filter(l => l.level === 'intermedio').length + femaleLooks.filter(l => l.level === 'intermedio').length,
        experimental: maleLooks.filter(l => l.level === 'experimental').length + femaleLooks.filter(l => l.level === 'experimental').length,
        especifico: maleLooks.filter(l => l.level === 'especifico').length + femaleLooks.filter(l => l.level === 'especifico').length,
      }
    };
  };

  const libraryInfo = getLibraryInfo();

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Gerando Imagens em Lote</h1>

            <div className="text-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">
                Gerando imagens <span className="font-semibold">{selectedGender === 'male' ? 'masculinas' : 'femininas'}</span>...
              </p>
            </div>

            {progress && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progresso Geral</span>
                    <span>{progress.completed + progress.failed}/{progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-600 mt-1">
                    {progress.percentage}% completo
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Detalhes:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-600">✅ Sucesso:</span> {progress.completed}
                    </div>
                    <div>
                      <span className="text-red-600">❌ Falhas:</span> {progress.failed}
                    </div>
                    <div className="col-span-2">
                      <span className="text-blue-600">🔄 Atual:</span> {progress.currentLook}
                    </div>
                    {progress.estimatedTimeRemaining > 0 && (
                      <div className="col-span-2">
                        <span className="text-purple-600">⏱️ Tempo restante:</span> ~{progress.estimatedTimeRemaining} min
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Geração em Lote</h1>
          <p className="text-gray-600">Gere e gerencie imagens para o sistema de calibração visual</p>
        </div>

        {/* Biblioteca Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📚 Biblioteca de Prompts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{libraryInfo.male}</div>
              <div className="text-sm text-gray-600">Looks Masculinos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">{libraryInfo.female}</div>
              <div className="text-sm text-gray-600">Looks Femininos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{libraryInfo.total}</div>
              <div className="text-sm text-gray-600">Total de Looks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{libraryInfo.levels.conservador + libraryInfo.levels.intermedio + libraryInfo.levels.experimental + libraryInfo.levels.especifico}</div>
              <div className="text-sm text-gray-600">Níveis</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-blue-100 p-2 rounded text-center">
              <span className="text-blue-700 font-medium">Conservadores:</span> {libraryInfo.levels.conservador}
            </div>
            <div className="bg-green-100 p-2 rounded text-center">
              <span className="text-green-700 font-medium">Intermédios:</span> {libraryInfo.levels.intermedio}
            </div>
            <div className="bg-purple-100 p-2 rounded text-center">
              <span className="text-purple-700 font-medium">Experimentais:</span> {libraryInfo.levels.experimental}
            </div>
            <div className="bg-orange-100 p-2 rounded text-center">
              <span className="text-orange-700 font-medium">Específicos:</span> {libraryInfo.levels.especifico}
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Estatísticas de Geração</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.generation.male}</div>
                <div className="text-sm text-gray-600">Imagens Masculinas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">{stats.generation.female}</div>
                <div className="text-sm text-gray-600">Imagens Femininas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.generation.total}</div>
                <div className="text-sm text-gray-600">Total Geradas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(stats.generation.cacheSize / 1024)}KB</div>
                <div className="text-sm text-gray-600">Cache Size</div>
              </div>
            </div>
            {stats.generation.lastGeneration && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Última geração: {new Date(stats.generation.lastGeneration).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🎮 Controles de Geração</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Gênero:
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setSelectedGender('male')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedGender === 'male'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👨 Masculino
              </button>
              <button
                onClick={() => setSelectedGender('female')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedGender === 'female'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👩 Feminino
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={startBatchGeneration}
              className="bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              🚀 Gerar Imagens ({selectedGender})
            </button>
            <button
              onClick={forceRegeneration}
              className="bg-orange-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors"
            >
              🔄 Forçar Regeneração
            </button>
            <button
              onClick={clearCache}
              className="bg-red-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Limpar Cache
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Aviso:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• A geração consome créditos da API Replicate</li>
              <li>• O processo pode levar 20-40 minutos por gênero</li>
              <li>• As imagens são salvas em cache local</li>
              <li>• Forçar regeneração substitui todas as imagens existentes</li>
            </ul>
          </div>
        </div>

        {/* Imagens Geradas */}
        {generatedImages.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🖼️ Imagens Recentes ({generatedImages.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {generatedImages.map((image, index) => (
                <div key={image.id || index} className="text-center">
                  {image.imageUrl ? (
                    <img
                      src={image.imageUrl}
                      alt={image.name}
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100x100/cccccc/666666?text=Error';
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-200 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-2xl">❌</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-600 font-medium truncate">{image.name}</div>
                  <div className={`text-xs ${
                    image.level === 'conservador' ? 'text-blue-600' :
                    image.level === 'intermedio' ? 'text-green-600' :
                    image.level === 'experimental' ? 'text-purple-600' :
                    'text-orange-600'
                  }`}>
                    {image.level}
                  </div>
                  {image.error && (
                    <div className="text-xs text-red-600" title={image.error}>
                      Erro
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Navigation */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🏠 Voltar para o App
          </a>
          <span className="mx-4">|</span>
          <a
            href="/test-direct"
            className="inline-block bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔗 Test API Direta
          </a>
        </div>
      </div>
    </div>
  );
};

export default BatchGenerationTest;