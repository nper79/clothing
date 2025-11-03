import React, { useState, useEffect } from 'react';
import type { Answers, LookFeedback } from '../types';
import { ReplicateImageService } from '../services/replicateImageService';

interface VisualCalibrationProps {
  initialProfile: Answers;
  onComplete: (feedback: LookFeedback[]) => void;
}

interface StyleLook {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
  styleCategory: string;
  comfortLevel: number;
  formality: string;
}

const VisualCalibrationSwipe: React.FC<VisualCalibrationProps> = ({ initialProfile, onComplete }) => {
  const [currentLookIndex, setCurrentLookIndex] = useState(0);
  const [feedback, setFeedback] = useState<LookFeedback[]>([]);
  const [showDetailButtons, setShowDetailButtons] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});

  // Load images based on gender when component mounts
  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoadingImages(true);
        const gender = initialProfile.gender || 'neutral';
        console.log('Loading visual calibration images for gender:', gender);

        // Check if Replicate is configured
        if (!ReplicateImageService.isConfigured()) {
          console.log('Replicate API not configured, using style prompts only');
          const stylePrompts = ReplicateImageService.getStylePrompts(gender);
          console.log('Prepared style prompts for Replicate image generation:', stylePrompts.length);
          setIsLoadingImages(false);
          return;
        }

        // Generate actual images using Replicate
        console.log('Generating calibration images using Replicate...');
        const images = await ReplicateImageService.generateCalibrationImages(gender);
        const imageMap: { [key: string]: string } = {};

        images.forEach(img => {
          if (img.imageData) {
            imageMap[img.id] = img.imageData;
          }
        });

        setGeneratedImages(imageMap);
        console.log(`Successfully loaded ${Object.keys(imageMap).length} images from Replicate`);

      } catch (error) {
        console.error('Error loading visual calibration images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadImages();
  }, [initialProfile.gender]);

  const testImageGeneration = async () => {
    try {
      console.log('Testing image generation for current look...');
      const gender = initialProfile.gender || 'neutral';

      // Check if Replicate is configured
      if (!ReplicateImageService.isConfigured()) {
        alert('Replicate API não está configurada. Adicione VITE_REPLICATE_API_TOKEN ao seu arquivo .env');
        return;
      }

      // Get the style prompt for current look
      const stylePrompts = ReplicateImageService.getStylePrompts(gender);
      const currentPrompt = stylePrompts.find(p => p.category === currentLook.styleCategory);

      if (currentPrompt) {
        console.log('Testing Replicate prompt:', currentPrompt.prompt.substring(0, 100) + '...');

        // Generate actual image using Replicate
        console.log('Generating image with Replicate for:', currentLook.name);

        const imageUrl = await ReplicateImageService.generateSingleImage(currentPrompt.prompt);

        if (imageUrl) {
          // Add the generated image to the state
          setGeneratedImages(prev => ({
            ...prev,
            [currentLook.id]: imageUrl
          }));

          alert(`✅ Imagem gerada com sucesso para: ${currentLook.name}\nGênero: ${gender}\n\nA imagem foi adicionada ao calalog!`);
        } else {
          alert('⚠️ A imagem foi gerada mas não foi possível obter a URL. Verifique o console.');
        }
      } else {
        alert('Prompt não encontrado para este estilo.');
      }
    } catch (error) {
      console.error('Error testing image generation:', error);
      alert(`❌ Erro ao testar geração de imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nVerifique o console para detalhes.`);
    }
  };

  // 15 diverse style looks spanning different categories, comfort levels, and formality
  const styleLooks: StyleLook[] = [
    {
      id: 'minimalist_work',
      name: 'Minimalista Executivo',
      description: 'Look clean e sofisticado para ambiente corporativo',
      imageUrl: '/api/placeholder/400/600',
      tags: ['minimalista', 'trabalho', 'elegante'],
      styleCategory: 'Minimalista',
      comfortLevel: 7,
      formality: 'Formal'
    },
    {
      id: 'streetwear_casual',
      name: 'Streetwear Urbano',
      description: 'Estilo descontraído com influência urbana',
      imageUrl: '/api/placeholder/400/600',
      tags: ['streetwear', 'casual', 'moderno'],
      styleCategory: 'Streetwear',
      comfortLevel: 9,
      formality: 'Casual'
    },
    {
      id: 'bohemian_artistic',
      name: 'Boêmio Artístico',
      description: 'Expressão livre com toques orgânicos',
      imageUrl: '/api/placeholder/400/600',
      tags: ['boêmio', 'artístico', 'criativo'],
      styleCategory: 'Boêmio',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'punk_rock',
      name: 'Punk Rock Attitude',
      description: 'Rebelde e ousado com peças statement',
      imageUrl: '/api/placeholder/400/600',
      tags: ['punk', 'rock', 'ousado'],
      styleCategory: 'Punk',
      comfortLevel: 6,
      formality: 'Casual'
    },
    {
      id: 'vintage_retro',
      name: 'Vintage Charmoso',
      description: 'Clássico atemporal com personalidade',
      imageUrl: '/api/placeholder/400/600',
      tags: ['vintage', 'retro', 'clássico'],
      styleCategory: 'Vintage',
      comfortLevel: 7,
      formality: 'Smart Casual'
    },
    {
      id: 'cyberpunk_tech',
      name: 'Cyberpunk Future',
      description: 'Futurista com elementos tecnológicos',
      imageUrl: '/api/placeholder/400/600',
      tags: ['cyberpunk', 'tecnológico', 'futurista'],
      styleCategory: 'Cyberpunk',
      comfortLevel: 5,
      formality: 'Casual'
    },
    {
      id: 'hiphop_urban',
      name: 'Hip-Hop Urban',
      description: 'Inspiração urbana com atitude',
      imageUrl: '/api/placeholder/400/600',
      tags: ['hip-hop', 'urbano', 'baggy'],
      styleCategory: 'Hip-Hop',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'skate_punk',
      name: 'Skate Punk',
      description: 'Descontraído e funcional para skatistas',
      imageUrl: '/api/placeholder/400/600',
      tags: ['skate', 'punk', 'descontraído'],
      styleCategory: 'Skate',
      comfortLevel: 9,
      formality: 'Muito Casual'
    },
    {
      id: 'gothic_dark',
      name: 'Gótico Dark',
      description: 'Mistério e elegância sombria',
      imageUrl: '/api/placeholder/400/600',
      tags: ['gótico', 'dark', 'misterioso'],
      styleCategory: 'Gótico',
      comfortLevel: 4,
      formality: 'Smart Casual'
    },
    {
      id: 'prep_collegiate',
      name: 'Prep Collegiate',
      description: 'Clássico americano universitário',
      imageUrl: '/api/placeholder/400/600',
      tags: ['prep', 'collegiate', 'clássico'],
      styleCategory: 'Preppy',
      comfortLevel: 6,
      formality: 'Smart Casual'
    },
    {
      id: 'raver_festival',
      name: 'Raver Festival',
      description: 'Colorido e vibrante para festivais',
      imageUrl: '/api/placeholder/400/600',
      tags: ['raver', 'festival', 'colorido'],
      styleCategory: 'Festival',
      comfortLevel: 7,
      formality: 'Casual'
    },
    {
      id: 'business_formal',
      name: 'Business Formal',
      description: 'Poder e profissionalismo máximo',
      imageUrl: '/api/placeholder/400/600',
      tags: ['negócios', 'formal', 'executivo'],
      styleCategory: 'Formal',
      comfortLevel: 5,
      formality: 'Muito Formal'
    },
    {
      id: 'artsy_eclectic',
      name: 'Artsy Eclectic',
      description: 'Mistura ousada de estilos e texturas',
      imageUrl: '/api/placeholder/400/600',
      tags: ['artístico', 'ecletico', 'criativo'],
      styleCategory: 'Artístico',
      comfortLevel: 6,
      formality: 'Casual'
    },
    {
      id: 'minimalist_casual',
      name: 'Minimalista Casual',
      description: 'Simplicidade e conforto no dia a dia',
      imageUrl: '/api/placeholder/400/600',
      tags: ['minimalista', 'casual', 'simples'],
      styleCategory: 'Minimalista',
      comfortLevel: 10,
      formality: 'Muito Casual'
    },
    {
      id: 'indie_alternative',
      name: 'Indie Alternative',
      description: 'Alternativo com toque vintage',
      imageUrl: '/api/placeholder/400/600',
      tags: ['indie', 'alternativo', 'vintage'],
      styleCategory: 'Indie',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'luxury_designer',
      name: 'Luxury Designer',
      description: 'Alta moda e sofisticação',
      imageUrl: '/api/placeholder/400/600',
      tags: ['luxo', 'designer', 'sofisticado'],
      styleCategory: 'Luxo',
      comfortLevel: 6,
      formality: 'Formal'
    },
      ];

  const currentLook = styleLooks[currentLookIndex];
  const progress = ((currentLookIndex + 1) / styleLooks.length) * 100;

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = currentX - dragStartX;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    const threshold = 100; // Minimum drag distance to trigger action

    if (Math.abs(dragOffset) > threshold) {
      const rating = dragOffset > 0 ?
        Math.min(10, Math.floor(5 + (dragOffset - threshold) / 50)) :
        Math.max(0, Math.floor(5 + (dragOffset + threshold) / 50));

      handleSwipe(rating);
    } else {
      // Snap back to center
      setDragOffset(0);
    }

    setIsDragging(false);
  };

  const handleSwipe = (overallRating: number) => {
    const lookFeedback: LookFeedback = {
      lookId: currentLook.id,
      overallRating,
      pieceFeedback: {
        top: 0,
        bottom: 0,
        shoes: 0,
        accessories: 0,
        fit: 0,
        colors: 0,
        style: 0,
        formality: 0
      },
      timestamp: Date.now()
    };

    const newFeedback = [...feedback, lookFeedback];
    setFeedback(newFeedback);

    if (currentLookIndex < styleLooks.length - 1) {
      setCurrentLookIndex(currentLookIndex + 1);
      setDragOffset(0);
      setShowDetailButtons(false);
    } else {
      // Complete visual calibration
      console.log('Visual calibration complete with feedback:', newFeedback);
      onComplete(newFeedback);
    }
  };

  const handlePieceFeedback = (piece: keyof LookFeedback['pieceFeedback'], value: number) => {
    // This would be used for detailed feedback when showDetailButtons is true
    // For now, we keep it simple
  };

  const handleQuickRating = (rating: number) => {
    handleSwipe(rating);
  };

  const skipLook = () => {
    handleSwipe(5); // Neutral rating for skipped looks
  };

  if (currentLookIndex >= styleLooks.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Calibração Completa!</h2>
          <p className="text-gray-600 mb-6">Obrigado por ajudar-nos a entender seu estilo único.</p>
          <button
            onClick={() => onComplete(feedback)}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Look {currentLookIndex + 1} de {styleLooks.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Look Card */}
        <div
          className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-transform duration-200 ${
            isDragging ? '' : 'hover:shadow-2xl'
          }`}
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Image Display */}
          <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-gray-700">{currentLook.styleCategory}</span>
            </div>
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-xs font-medium text-gray-700">
                Conforto: {currentLook.comfortLevel}/10
              </span>
            </div>

            {isLoadingImages ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-500">A gerar imagens...</p>
                <p className="text-sm text-gray-400 mt-2">Isto pode levar alguns momentos</p>
              </div>
            ) : generatedImages[currentLook.id] ? (
              <img
                src={generatedImages[currentLook.id]}
                alt={currentLook.name}
                className="w-full h-full object-cover rounded-t-lg"
              />
            ) : (
              <div className="text-center">
                <span className="text-6xl">👔</span>
                <p className="text-gray-500 mt-2">Imagem do Look</p>
                <p className="text-xs text-gray-400 mt-1">
                  Gênero: {initialProfile.gender || 'neutral'}
                </p>
                <button
                  onClick={() => testImageGeneration()}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🎨 Testar Geração de Imagem
                </button>
              </div>
            )}
          </div>

          {/* Look Info */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{currentLook.name}</h3>
            <p className="text-gray-600 mb-4">{currentLook.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {currentLook.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleSwipe(8)} // Like with high rating
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  ❤️ Like
                </button>
                <button
                  onClick={() => setShowDetailButtons(!showDetailButtons)}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  👎 Dislike
                </button>
              </div>

              {/* Detail Feedback - Always visible when dislike is clicked */}
              {showDetailButtons && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-center text-sm text-gray-600 mb-2">
                    What don't you like about this look? (Select all that apply)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'top', label: 'Top Piece', icon: '👔' },
                      { id: 'bottom', label: 'Bottom Piece', icon: '👖' },
                      { id: 'shoes', label: 'Shoes', icon: '👟' },
                      { id: 'accessories', label: 'Accessories', icon: '🎩' },
                      { id: 'colors', label: 'Colors', icon: '🎨' },
                      { id: 'fit', label: 'Fit', icon: '📏' },
                      { id: 'style', label: 'Overall Style', icon: '✨' },
                      { id: 'formality', label: 'Too Formal/Casual', icon: '🎭' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handlePieceFeedback(item.id as keyof LookFeedback['pieceFeedback'], -1)}
                        className="p-3 rounded-lg border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 transition-all text-sm"
                      >
                        <span className="text-lg mr-1">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-center mt-3">
                    <button
                      onClick={() => handleSwipe(3)} // Low rating for disliked items
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Submit Feedback →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Skip Button */}
            <div className="mt-6 text-center">
              <button
                onClick={skipLook}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Não tenho opinião →
              </button>
            </div>
          </div>
        </div>

        {/* Swipe Instructions */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Arraste para o lado para avaliar rapidamente</p>
          <p className="text-xs mt-1">Esquerda = Não gosta | Direita = Gosta</p>
        </div>
      </div>
    </div>
  );
};

export default VisualCalibrationSwipe;