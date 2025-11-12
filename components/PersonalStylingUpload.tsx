import React, { useState } from 'react';
import { Upload, Sparkles } from 'lucide-react';

interface PersonalStylingUploadProps {
  onPhotoUploaded: (photoUrl: string) => void;
}

export const PersonalStylingUpload: React.FC<PersonalStylingUploadProps> = ({ onPhotoUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

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
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoUrl = event.target?.result as string;
      setUploadedPhoto(photoUrl);
      setIsUploading(false);

      setTimeout(() => {
        onPhotoUploaded(photoUrl);
      }, 1000);
    };
    reader.readAsDataURL(file);
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
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileInput} />
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
                  Uploaded
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 mb-1">Photo uploaded successfully!</p>
                <p className="text-sm text-gray-500">Generating your personalized looks...</p>
                <div className="mt-4 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              </div>
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
