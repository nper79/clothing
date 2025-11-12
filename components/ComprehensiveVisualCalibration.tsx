import React, { useState, useEffect } from 'react';
import type { Answers, LookFeedback } from '../types';
import { BatchImageGenerator, GeneratedComprehensiveImage, BatchGenerationProgress } from '../services/batchImageGenerator';
import { ComprehensivePromptLibrary, ComprehensiveLook } from '../services/comprehensivePromptLibrary';

interface ComprehensiveVisualCalibrationProps {
  initialProfile: Answers;
  onComplete: (feedback: LookFeedback[]) => void;
}

interface CalibratedLook {
  id: string;
  name: string;
  category: string;
  level: string;
  formality: string;
  description: string;
  imageUrl: string;
  tags: string[];
  generatedImage: GeneratedComprehensiveImage;
}

const ComprehensiveVisualCalibration: React.FC<ComprehensiveVisualCalibrationProps> = ({ initialProfile, onComplete }) => {
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [feedback, setFeedback] = useState<LookFeedback[]>([]);
  const [showDetailButtons, setShowDetailButtons] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Estados para geração de imagens
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(true);
  const [calibrationLooks, setCalibrationLooks] = useState<CalibratedLook[]>([]);
  const [generationProgress, setGenerationProgress] = useState<BatchGenerationProgress | null>(null);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);

  // Detecta gênero selecionado
  const gender = (initialProfile.gender === 'male' || initialProfile.gender === 'female')
    ? initialProfile.gender as 'male' | 'female'
    : 'male';

  // Carrega ou gera imagens quando o componente monta
  useEffect(() => {
    const loadCalibrationImages = async () => {
      try {
        setIsCheckingCache(true);
        console.log('🔍 Checking for cached calibration images for gender:', gender);

        // Tenta obter imagens do cache novo
        let cachedImages = BatchImageGenerator.getCalibrationLooks(gender, 15);

        // Se não encontrar no novo, tenta do cache antigo (StyleImageGenerator)
        if (cachedImages.length === 0) {
          console.log('🔄 Trying legacy cache system...');
          try {
            // Importa dinamicamente o sistema antigo
            const { StyleImageGenerator } = await import('../services/styleImageGenerator');
            const legacyImages = await StyleImageGenerator.getOrGenerateImages(gender);

            if (legacyImages.length > 0) {
              console.log('✅ Found legacy images, converting to new format...');
              // Converte as imagens antigas para o novo formato
              const convertedImages = legacyImages.slice(0, 15).map((img, index) => ({
                id: `legacy_${gender}_${index}`,
                lookId: img.styleCategory.toLowerCase(),
                gender,
                name: img.styleCategory,
                category: img.styleCategory,
                level: 'intermedio',
                prompt: img.prompt,
                imageUrl: img.imageUrl,
                isGenerated: img.imageUrl !== '',
                error: img.imageUrl ? undefined : 'No image URL',
                generatedAt: img.generatedAt
              }));

              const looks = mapImagesToCalibratedLooks(convertedImages);
              setCalibrationLooks(looks);
              setNeedsRegeneration(false);
              return;
            }
          } catch (legacyError) {
            console.log('⚠️ Legacy system not available:', legacyError);
          }
        }

        // Verifica se já temos imagens suficientes
        const isReady = BatchImageGenerator.isReadyForCalibration(gender);

        if (isReady && cachedImages.length > 0) {
          console.log('✅ Found sufficient cached images, loading...');
          const looks = mapImagesToCalibratedLooks(cachedImages);
          setCalibrationLooks(looks);
          setNeedsRegeneration(false);
        } else {
          console.log('⚠️ Insufficient cached images, generation needed');
          setNeedsRegeneration(true);
        }
      } catch (error) {
        console.error('Error checking cache:', error);
        setNeedsRegeneration(true);
      } finally {
        setIsCheckingCache(false);
      }
    };

    loadCalibrationImages();
  }, [gender]);

  // Inicia geração de imagens se necessário
  const startImageGeneration = async () => {
    try {
      setIsGeneratingImages(true);
      setGenerationProgress({
        total: 0,
        completed: 0,
        failed: 0,
        currentLook: 'Preparando...',
        percentage: 0,
        estimatedTimeRemaining: 0
      });

      console.log('🚀 Starting comprehensive image generation...');

      const generatedImages = await BatchImageGenerator.generateAllGenderImages(
        gender,
        (progress: BatchGenerationProgress) => {
          setGenerationProgress(progress);
        }
      );

      console.log(`🎉 Generation complete: ${generatedImages.length} images`);

      // Obtém seleção balanceada para calibração
      const calibrationImages = BatchImageGenerator.getCalibrationLooks(gender, 15);
      const looks = mapImagesToCalibratedLooks(calibrationImages);
      setCalibrationLooks(looks);
      setNeedsRegeneration(false);

    } catch (error) {
      console.error('Error during image generation:', error);
    } finally {
      setIsGeneratingImages(false);
      setGenerationProgress(null);
    }
  };

  // Mapeia imagens geradas para o formato de calibração
  const mapImagesToCalibratedLooks = (images: GeneratedComprehensiveImage[]): CalibratedLook[] => {
    return images.map((image, index) => ({
      id: image.id,
      name: image.name,
      category: image.category,
      level: image.level,
      formality: image.level === 'conservador' ? 'formal' :
                image.level === 'intermedio' ? 'smart-casual' :
                image.level === 'experimental' ? 'edgy' : 'casual',
      description: `${image.name} - ${image.category}`,
      imageUrl: image.imageUrl,
      tags: image.prompt.split(',').map(tag => tag.trim()).slice(0, 3),
      generatedImage: image
    }));
  };

  const handleSwipe = (rating: number) => {
    const currentLook = calibrationLooks[currentLookIndex];
    if (!currentLook) return;

    const newFeedback: LookFeedback = {
      lookId: currentLook.id,
      styleCategory: currentLook.category,
      rating,
      timestamp: new Date()
    };

    setFeedback([...feedback, newFeedback]);

    if (currentLookIndex < calibrationLooks.length - 1) {
      setCurrentLookIndex(currentLookIndex + 1);
      setDragOffset(0);
    } else {
      onComplete([...feedback, newFeedback]);
    }
  };

  const skipLook = () => {
    if (currentLookIndex < calibrationLooks.length - 1) {
      setCurrentLookIndex(currentLookIndex + 1);
      setDragOffset(0);
    } else {
      onComplete(feedback);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const offset = e.clientX - dragStartX;
      setDragOffset(offset);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      if (Math.abs(dragOffset) > 100) {
        if (dragOffset > 0) {
          handleSwipe(8);
        } else {
          handleSwipe(2);
        }
      } else {
        setDragOffset(0);
      }
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, dragOffset]);

  // Estado de carregamento inicial
  if (isCheckingCache) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">A verificar imagens disponíveis...</p>
        </div>
      </div>
    );
  }

  // Estado de geração de imagens
  if (isGeneratingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">A Gerar Imagens Personalizadas</h2>
          <p className="text-gray-600 mb-6">
            Estamos a criar {gender === 'male' ? 'looks masculinos' : 'looks femininos'} personalizados para si...
          </p>

          {generationProgress && (
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progresso</span>
                  <span>{generationProgress.completed + generationProgress.failed}/{generationProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>Atual: <span className="font-medium">{generationProgress.currentLook}</span></p>
                <p>Sucesso: <span className="text-green-600">{generationProgress.completed}</span></p>
                <p>Falhas: <span className="text-red-600">{generationProgress.failed}</span></p>
                {generationProgress.estimatedTimeRemaining > 0 && (
                  <p>Tempo restante: ~{generationProgress.estimatedTimeRemaining} min</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Estado de necessidade de regeneração
  if (needsRegeneration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎨</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Personalizar a Sua Experiência</h2>
          <p className="text-gray-600 mb-8">
            Precisamos gerar imagens personalizadas de {gender === 'male' ? 'looks masculinos' : 'looks femininos'}
            para criar a sua calibração visual personalizada.
          </p>
          <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">O que vamos gerar:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-left">
              <div className="flex items-center">
                <span className="text-2xl mr-2">👔</span>
                <div>
                  <p className="font-medium">Conservadores</p>
                  <p className="text-gray-500">5 looks clássicos</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">👕</span>
                <div>
                  <p className="font-medium">Intermédios</p>
                  <p className="text-gray-500">5 looks versáteis</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">🧥</span>
                <div>
                  <p className="font-medium">Experimentais</p>
                  <p className="text-gray-500">5 looks ousados</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">👟</span>
                <div>
                  <p className="font-medium">Específicos</p>
                  <p className="text-gray-500">5 looks temáticos</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={startImageGeneration}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Gerar Imagens Personalizadas
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Isso levará alguns minutos e só precisa ser feito uma vez por gênero
          </p>
        </div>
      </div>
    );
  }

  // Estado sem looks disponíveis
  if (calibrationLooks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">Nenhuma imagem disponível</p>
        </div>
      </div>
    );
  }

  const currentLook = calibrationLooks[currentLookIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Calibração Visual Completa</h2>
          <p className="text-gray-600">
            Arrasta para a direita se gostas, esquerda se não gostas
          </p>
          <div className="flex justify-center items-center mt-2 space-x-4 text-sm text-gray-500">
            <span>Look {currentLookIndex + 1} de {calibrationLooks.length}</span>
            <span>•</span>
            <span>Género: {gender === 'male' ? 'Masculino' : 'Feminino'}</span>
          </div>
        </div>

        {/* Swipe Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div
            className="relative h-96 bg-gray-100 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            style={{
              transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease',
              opacity: Math.max(0, 1 - Math.abs(dragOffset) / 500)
            }}
          >
            {/* Image Display */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100">
              {currentLook.imageUrl ? (
                <img
                  src={currentLook.imageUrl}
                  alt={currentLook.name}
                  className="w-full h-full object-cover"
                  onLoad={() => console.log('Calibration image loaded:', currentLook.imageUrl)}
                  onError={(e) => {
                    console.error('Calibration image failed to load:', currentLook.imageUrl);
                    e.currentTarget.src = 'https://picsum.photos/400/600';
                  }}
                />
              ) : (
                <div className="text-center">
                  <span className="text-6xl">👔</span>
                  <p className="text-gray-500 mt-2">Carregando Look...</p>
                </div>
              )}
            </div>

            {/* Swipe Indicators */}
            {Math.abs(dragOffset) > 50 && (
              <div className="absolute inset-0 pointer-events-none">
                {dragOffset > 0 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    ❤️ Gosto
                  </div>
                )}
                {dragOffset < 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    ❌ Não Gosto
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Look Info */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-800">{currentLook.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                currentLook.level === 'conservador' ? 'bg-blue-100 text-blue-700' :
                currentLook.level === 'intermedio' ? 'bg-green-100 text-green-700' :
                currentLook.level === 'experimental' ? 'bg-purple-100 text-purple-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {currentLook.level}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{currentLook.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {currentLook.tags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleSwipe(2)}
                className="flex-1 bg-red-100 text-red-600 font-medium py-3 px-4 rounded-lg hover:bg-red-200 transition-colors"
              >
                ❌ Não Gosto
              </button>
              <button
                onClick={skipLook}
                className="flex-1 bg-gray-100 text-gray-600 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⏭️ Pular
              </button>
              <button
                onClick={() => handleSwipe(8)}
                className="flex-1 bg-green-100 text-green-600 font-medium py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
              >
                ❤️ Gosto
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progresso</span>
            <span>{currentLookIndex + 1}/{calibrationLooks.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentLookIndex + 1) / calibrationLooks.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveVisualCalibration;