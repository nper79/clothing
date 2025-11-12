
import React, { useState, useRef, useCallback } from 'react';

interface ImageUploaderProps {
  onGenerate: (image: { base64: string; mimeType: string }) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onGenerate }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImagePreview(reader.result as string);
        setImageData({ base64: base64String, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = () => {
    if (imageData) {
      onGenerate(imageData);
    }
  };
  
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-4 md:p-8 text-center bg-surface-light rounded-xl border border-border-light">
      <h2 className="text-2xl md:text-3xl font-bold mb-2 text-text-light">Upload Your Photo</h2>
      <p className="text-muted-light mb-6">Let's find the perfect look for you.</p>

      <div
        className="w-full h-64 border-2 border-dashed border-border-light rounded-lg flex items-center justify-center bg-background-light cursor-pointer hover:border-primary/70 transition-colors"
        onClick={triggerFileSelect}
      >
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg p-1" />
        ) : (
          <div className="text-muted-light">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Click to upload an image</span>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerateClick}
        disabled={!imageData}
        className="mt-6 w-full px-6 py-4 text-white font-bold bg-primary rounded-lg hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed transition-all duration-300"
      >
        Generate My Style
      </button>
    </div>
  );
};

export default ImageUploader;
