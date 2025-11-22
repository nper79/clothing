
import { remixLookWithPrompt } from './personalStylingWorkflow';

// Mock dependencies
jest.mock('./personalStylingWorkflow', () => {
  const original = jest.requireActual('./personalStylingWorkflow');
  return {
    ...original,
    generateNanoBananaImage: jest.fn(async (prompt, imageInputs) => {
      console.log('generateNanoBananaImage called with:', imageInputs.length, 'images');
      console.log('Image inputs:', imageInputs);
      return 'https://example.com/result.jpg';
    }),
    persistRemixImage: jest.fn(async () => 'path/to/image.jpg'),
    getRemixSignedUrl: jest.fn(async () => 'https://example.com/signed.jpg'),
  };
});

async function testRemix() {
  const userPhoto = 'https://example.com/user.jpg';
  const prompt = 'Test prompt';
  const itemImages = [
    'https://example.com/item1.jpg',
    'https://example.com/item2.jpg',
    'https://example.com/item3.jpg'
  ];
  const referenceImage = itemImages[0];

  console.log('Testing remixLookWithPrompt with 3 items...');
  
  // We can't easily run this because of imports and environment variables.
  // Instead, I will simulate the logic directly here to verify my understanding.
  
  const normalizedImages = [userPhoto, referenceImage, ...itemImages].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const imageInputs = Array.from(new Set(normalizedImages));
  
  console.log('Resulting imageInputs:', imageInputs);
  console.log('Count:', imageInputs.length);
  
  if (imageInputs.length === 4) {
    console.log('SUCCESS: All items included');
  } else {
    console.log('FAILURE: Items missing');
  }
}

testRemix();
