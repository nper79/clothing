import React, { useState, useEffect } from 'react';
import type { Answers, LookFeedback } from '../types';
import { StyleImageGenerator } from '../services/styleImageGenerator';
import '../utils/debugUtils'; // Import debug utilities

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

  // Load or generate AI images based on gender when component mounts
  useEffect(() => {
    const loadStyleImages = async () => {
      try {
        setIsLoadingImages(true);
        const gender = (initialProfile.gender === 'male' || initialProfile.gender === 'female')
          ? initialProfile.gender as 'male' | 'female'
          : 'male'; // Default to male if not specified

        console.log('Loading/generating AI images for gender:', gender);

        // Get or generate AI images for this gender
        const styleImages = await StyleImageGenerator.getOrGenerateImages(gender);
        const imageMap: { [key: string]: string } = {};

        styleImages.forEach(img => {
          // Map style category to match the look IDs in styleLooks array
          const categoryKey = img.styleCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          imageMap[categoryKey] = img.imageUrl;
          console.log(`Loaded AI-generated image for ${img.gender} ${img.styleCategory} -> key: ${categoryKey}, url: ${img.imageUrl}`);
        });

        setGeneratedImages(imageMap);
        console.log(`Successfully loaded ${Object.keys(imageMap).length} AI-generated images for ${gender}`);

      } catch (error) {
        console.error('Error loading/generating style images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadStyleImages();
  }, [initialProfile.gender]);

  // Function to get the appropriate image URL based on gender and style category
  const getImageUrl = (styleCategory: string) => {
    // Normalize the category key to match how we store it
    const categoryKey = styleCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    console.log('Getting AI-generated image URL for:', {
      originalCategory: styleCategory,
      categoryKey,
      hasImage: !!generatedImages[categoryKey],
      availableKeys: Object.keys(generatedImages)
    });

    if (generatedImages[categoryKey]) {
      console.log('Found AI-generated image:', generatedImages[categoryKey]);
      return generatedImages[categoryKey];
    }

    // This should not happen if generation worked, but fallback just in case
    console.log('No AI-generated image found, using fallback');
    return `https://picsum.photos/400/600?random=${styleCategory}`;
  };

  // 15 diverse style looks spanning different categories, comfort levels, and formality
  const styleLooks: StyleLook[] = [
    {
      id: 'minimalist_work',
      name: 'Minimalista Executivo',
      description: 'Look clean e sofisticado para ambiente corporativo',
      imageUrl: getImageUrl('Minimalista'),
      tags: ['minimalista', 'trabalho', 'elegante'],
      styleCategory: 'Minimalista',
      comfortLevel: 7,
      formality: 'Formal'
    },
    {
      id: 'streetwear_casual',
      name: 'Streetwear Urbano',
      description: 'Estilo descontraido com influencia urbana',
      imageUrl: getImageUrl('Streetwear'),
      tags: ['streetwear', 'casual', 'moderno'],
      styleCategory: 'Streetwear',
      comfortLevel: 9,
      formality: 'Casual'
    },
    {
      id: 'bohemian_artistic',
      name: 'Boemio Artistico',
      description: 'Expressao livre com toques organicos',
      imageUrl: getImageUrl('Boemio'),
      tags: ['boemio', 'artistico', 'criativo'],
      styleCategory: 'Boemio',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'punk_rock',
      name: 'Punk Rock',
      description: 'Atitude rebelde com peças de destaque',
      imageUrl: getImageUrl('Punk'),
      tags: ['punk', 'rock', 'rebelde'],
      styleCategory: 'Punk',
      comfortLevel: 6,
      formality: 'Informal'
    },
    {
      id: 'vintage_retro',
      name: 'Vintage Retrô',
      description: 'Carácter nostálgico com peças atemporais',
      imageUrl: getImageUrl('Vintage'),
      tags: ['vintage', 'retro', 'classico'],
      styleCategory: 'Vintage',
      comfortLevel: 7,
      formality: 'Casual'
    },
    {
      id: 'hip_hop_moderno',
      name: 'Hip Hop Moderno',
      description: 'Estilo urbano com influências musicais',
      imageUrl: getImageUrl('Hip-Hop'),
      tags: ['hip-hop', 'urbano', 'moderno'],
      styleCategory: 'Hip-Hop',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'skate_relaxado',
      name: 'Skate Relaxado',
      description: 'Conforto e movimento para dia a dia',
      imageUrl: getImageUrl('Skate'),
      tags: ['skate', 'relaxado', 'confortavel'],
      styleCategory: 'Skate',
      comfortLevel: 9,
      formality: 'Informal'
    },
    {
      id: 'gotico_dramatico',
      name: 'Gótico Dramático',
      description: 'Misterio e elegância escura',
      imageUrl: getImageUrl('Gotico'),
      tags: ['gotico', 'dramatico', 'escuro'],
      styleCategory: 'Gotico',
      comfortLevel: 5,
      formality: 'Formal'
    },
    {
      id: 'preppy_classico',
      name: 'Preppy Clássico',
      description: 'Elegância acadêmica tradicional',
      imageUrl: getImageUrl('Preppy'),
      tags: ['preppy', 'classico', 'academico'],
      styleCategory: 'Preppy',
      comfortLevel: 7,
      formality: 'Formal'
    },
    {
      id: 'formal_executivo',
      name: 'Formal Executivo',
      description: 'Poder e profissionalismo',
      imageUrl: getImageUrl('Formal'),
      tags: ['formal', 'executivo', 'profissional'],
      styleCategory: 'Formal',
      comfortLevel: 6,
      formality: 'Formal'
    },
    {
      id: 'artistico_criativo',
      name: 'Artístico Criativo',
      description: 'Auto-expressão ousada',
      imageUrl: getImageUrl('Artistico'),
      tags: ['artistico', 'criativo', 'ousado'],
      styleCategory: 'Artistico',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'indie_alternativo',
      name: 'Indie Alternativo',
      description: 'Estilo único e não convencional',
      imageUrl: getImageUrl('Indie'),
      tags: ['indie', 'alternativo', 'unico'],
      styleCategory: 'Indie',
      comfortLevel: 8,
      formality: 'Casual'
    },
    {
      id: 'luxo_sofisticado',
      name: 'Luxo Sofisticado',
      description: 'Elegância e requinte absoluto',
      imageUrl: getImageUrl('Luxo'),
      tags: ['luxo', 'sofisticado', 'requinte'],
      styleCategory: 'Luxo',
      comfortLevel: 8,
      formality: 'Formal'
    },
    {
      id: 'techwear_funcional',
      name: 'Techwear Funcional',
      description: 'Tecnologia e vestuário funcional',
      imageUrl: getImageUrl('Techwear'),
      tags: ['techwear', 'funcional', 'tecnologico'],
      styleCategory: 'Techwear',
      comfortLevel: 7,
      formality: 'Casual'
    }
  ];

  const currentLook = styleLooks[currentLookIndex];

  const handleSwipe = (rating: number) => {
    const newFeedback: LookFeedback = {
      lookId: currentLook.id,
      styleCategory: currentLook.styleCategory,
      rating,
      timestamp: new Date()
    };

    setFeedback([...feedback, newFeedback]);

    if (currentLookIndex < styleLooks.length - 1) {
      setCurrentLookIndex(currentLookIndex + 1);
      setDragOffset(0);
    } else {
      onComplete([...feedback, newFeedback]);
    }
  };

  const skipLook = () => {
    if (currentLookIndex < styleLooks.length - 1) {
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

  if (isLoadingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Carregando imagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Calibração Visual</h2>
          <p className="text-gray-600">
            Arrasta para a direita se gostas, esquerda se não gostas
          </p>
          <div className="flex justify-center items-center mt-2 space-x-4 text-sm text-gray-500">
            <span>Look {currentLookIndex + 1} de {styleLooks.length}</span>
            <span>•</span>
            <span>Género: {initialProfile.gender || 'neutral'}</span>
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
              {(() => {
                const categoryKey = currentLook.styleCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                console.log('Looking for image key:', categoryKey, 'has image:', !!generatedImages[categoryKey]);
                console.log('Available images:', Object.keys(generatedImages));

                if (generatedImages[categoryKey]) {
                  const imageUrl = generatedImages[categoryKey];
                  console.log('Attempting to load image:', imageUrl);
                  return (
                    <img
                      src={imageUrl}
                      alt={currentLook.name}
                      className="w-full h-full object-cover"
                      onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                      onError={(e) => {
                        console.error('Image failed to load:', {
                          url: imageUrl,
                          categoryKey,
                          error: e
                        });
                        // Try to load a fallback image
                        e.currentTarget.src = 'https://picsum.photos/400/600';
                      }}
                    />
                  );
                } else {
                  return (
                    <div className="text-center">
                      <span className="text-6xl">👔</span>
                      <p className="text-gray-500 mt-2">Imagem do Look</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Categoria: {currentLook.styleCategory}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Key: {categoryKey}
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* Look Info */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{currentLook.name}</h3>
            <p className="text-gray-600 mb-4">{currentLook.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {currentLook.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>

            {/* Style Info */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
              <span className="font-medium">
                {currentLook.formality}
              </span>
              <span className="font-medium">
                Conforto: {currentLook.comfortLevel}/10
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleSwipe(8)}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  ❤️ Like
                </button>
                <button
                  onClick={() => handleSwipe(2)}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                >
                  👎 Dislike
                </button>
              </div>
            </div>

            {/* Skip Button */}
            <div className="mt-6 text-center">
              <button
                onClick={skipLook}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Nao tenho opiniao →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualCalibrationSwipe;