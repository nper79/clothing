import React, { useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';

interface PersonalStylingUploadProps {
  onPhotoUploaded: (photoUrl: string, gender: 'male' | 'female') => void;
}

export const PersonalStylingUpload: React.FC<PersonalStylingUploadProps> = ({ onPhotoUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>(() => {
    if (typeof window === 'undefined') {
      return 'female';
    }
    return (localStorage.getItem('latest_user_gender') as 'male' | 'female') || 'female';
  });

  // Load existing photo from localStorage on mount
  React.useEffect(() => {
    const savedPhoto = localStorage.getItem('latest_user_photo');
    const savedGender = localStorage.getItem('latest_user_gender') as 'male' | 'female';

    if (savedPhoto) {
      console.log('[PersonalStylingUpload] Loading existing photo from localStorage');
      setUploadedPhoto(savedPhoto);
      if (savedGender) {
        setSelectedGender(savedGender);
      }
    }
  }, []);

  // Clear state when component receives focus (user navigates back)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && uploadedPhoto) {
        // Check if localStorage has a different photo
        const currentPhoto = localStorage.getItem('latest_user_photo');
        if (currentPhoto !== uploadedPhoto) {
          console.log('[PersonalStylingUpload] Photo changed in localStorage, updating state');
          if (currentPhoto) {
            setUploadedPhoto(currentPhoto);
          } else {
            setUploadedPhoto(null);
            setUploadError(null);
          }
        }
      }
    };

    const handleFocus = () => {
      if (uploadedPhoto) {
        // Give the UI a fresh state when user returns to page
        setUploadError(null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [uploadedPhoto]);

  // Listen for storage changes from other tabs/components
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'latest_user_photo' && e.newValue) {
        console.log('[PersonalStylingUpload] Photo updated from another source');
        setUploadedPhoto(e.newValue);
      }
      if (e.key === 'latest_user_gender' && e.newValue) {
        setSelectedGender(e.newValue as 'male' | 'female');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[PersonalStylingUpload] handleFileInput called');
    setUploadError(null); // Clear any previous errors

    const files = e.target.files;
    if (files && files[0]) {
      // Clear the input value to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    console.log('[PersonalStylingUpload] handleFileUpload called with:', file.name, file.type, file.size);

    // Reset states
    setUploadError(null);
    setUploadedPhoto(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPG, PNG).');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Please choose an image under 10MB.');
      return;
    }

    setIsUploading(true);

    // Compress image if needed
    const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 1000, quality: number = 0.8): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to compressed JPEG (even if original was PNG)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                } else {
                  reject(new Error('Failed to compress image'));
                }
              },
              'image/jpeg',
              quality
            );
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    };

    // Process image with compression
    const processImage = async () => {
      try {
        let photoUrl: string;

        // Compress large images
        if (file.size > 1024 * 1024) { // If larger than 1MB
          console.log('[PersonalStylingUpload] Compressing image...');
          photoUrl = await compressImage(file);
          console.log('[PersonalStylingUpload] Image compressed');
        } else {
          // For small images, just read as data URL
          photoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        console.log('[PersonalStylingUpload] Photo processed, size:', Math.round(photoUrl.length * 0.75 / 1024), 'KB');

        setUploadedPhoto(photoUrl);
        setIsUploading(false);

        // Save to localStorage with error handling
        try {
          localStorage.setItem('latest_user_photo', photoUrl);
          localStorage.setItem('latest_user_gender', selectedGender);
          console.log('[PersonalStylingUpload] Successfully saved to localStorage');
        } catch (error) {
          console.error('[PersonalStylingUpload] Failed to save to localStorage:', error);
          setUploadError('Photo is too large to save locally. Try a smaller image or clear browser data.');
        }
      } catch (error) {
        console.error('[PersonalStylingUpload] Error processing image:', error);
        setIsUploading(false);
        setUploadError('Failed to process the photo. Please try again.');
      }
    };

    processImage();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Try Your Style</h1>
          <p className="text-gray-600">
            Upload a full-body photo and we will create amazing outfits tailored just for you.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <p className="text-sm text-gray-600 font-medium mb-3">Who should we style?</p>
          <div className="flex gap-3">
            {(['female', 'male'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSelectedGender(option)}
                className={`flex-1 px-4 py-2 rounded-xl border transition ${
                  selectedGender === option
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {option === 'female' ? 'Female' : 'Male'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!uploadedPhoto ? (
            <div
              className={`relative border-3 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-600">Processing your photo...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-1">Drag your photo here</p>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <label className="inline-block">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileInput}
                      />
                      <span className="px-6 py-2 bg-purple-500 text-white rounded-lg cursor-pointer hover:bg-purple-600 transition-colors">
                        Choose Photo
                      </span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-400">
                    <p>Format: JPG, PNG</p>
                    <p>Recommended: Full-body photo</p>
                    <p>Maximum size: 10MB</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img src={uploadedPhoto} alt="Your photo" className="w-full h-80 object-cover rounded-lg" />
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                  ✓ Uploaded
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 mb-1">Photo uploaded successfully!</p>
                <p className="text-sm text-gray-500 mb-4">Ready to generate your personalized looks</p>

                <button
                  onClick={() => {
                    console.log('[PersonalStylingUpload] Continue button clicked!');
                    if (uploadedPhoto && onPhotoUploaded) {
                      onPhotoUploaded(uploadedPhoto, selectedGender);
                    } else {
                      console.error('[PersonalStylingUpload] No photo or callback');
                      setUploadError('Something went wrong. Please try uploading again.');
                    }
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  Save and Continue
                </button>

                <button
                  onClick={() => {
                    console.log('[PersonalStylingUpload] Retake button clicked');
                    setUploadedPhoto(null);
                    setUploadError(null);
                    // Clear localStorage to allow new upload
                    localStorage.removeItem('latest_user_photo');
                    console.log('[PersonalStylingUpload] Cleared localStorage for new upload');
                  }}
                  className="ml-3 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{uploadError}</p>
              <button
                onClick={() => setUploadError(null)}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">Your photo is only used to generate these personalized looks.</p>
        </div>
      </div>
    </div>
  );
};
